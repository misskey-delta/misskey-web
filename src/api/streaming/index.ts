import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express_session from 'express-session';
import * as SocketIO from 'socket.io';
import * as cookie from 'cookie';
import * as mongoose from 'mongoose';
import * as MongoStore from 'connect-mongo';
import * as WebSocket from 'websocket';
const _MongoStore: MongoStore.MongoStoreFactory = MongoStore(express_session);
import config from '../../config';
import db from '../../db';
import endpoints from './endpoints';
import { logInfo } from 'log-cool';

interface IMessage {
	type: string;
	value: any;
}

const sessionStore: any = new _MongoStore({
	mongooseConnection: db
});

const sessionGetter = (sessionKey: string) => new Promise((res, rej) => {
	sessionStore.get(sessionKey, (err: any, session: any) => {
		if (err) {
			rej(err);
		}
		if (!session) {
			rej(new Error('session is null'));
		}
		res(session);
	});
});

const emitter = (socket: SocketIO.Socket, event: string, data: { [key: string]: string }, close?: boolean) => {
	socket.emit(event, data);
	if (close) {
		socket.disconnect(true);
	}
};

const connector = (endpoint: string): Promise<WebSocket.connection> => new Promise((resolve, reject) => {
	const client = new WebSocket.client();
	client.on('connectFailed', (error) => reject(error));
	client.on('connect', (connection) => resolve(connection));
	client.connect(endpoint);
});

export default (server: http.Server | https.Server): void => {
	const io: SocketIO.Server = SocketIO.listen(server);

	const connections: { [key: string]: WebSocket.connection } = {};
	const connectedCounts: { [key: string]: number } = {};

	endpoints.forEach(name => {
		io.of(`/streaming/${name}`).on('connect', async (socket: SocketIO.Socket) => {
			logInfo(`Request Socket.IO stream: /streaming/${name}`);
			// クッキーが無い場合切断
			if (!socket.handshake.headers.cookie) {
				emitter(socket, 'announcement', {
					type: 'error',
					message: `cookie doesn't exist`,
					happen: 'proxy'
				}, true);
				return;
			}
			const cookies: { [key: string]: string } = cookie.parse(socket.handshake.headers.cookie);
			// cookieに必要情報が無い場合切断
			if (!cookies[config.sessionKey] && ! /s:(.+?)\./.test(cookies[config.sessionKey])) {
				emitter(socket, 'announcement', {
					type: 'error',
					message: `cookie ${config.sessionKey} doesn't exist`,
					happen: 'proxy'
				}, true);
				return;
			}
			const sessionKey: string = cookies[config.sessionKey].match(/s:(.+?)\./)[1];
			let session: any;
			try {
				session = await sessionGetter(sessionKey);
			} catch (e) {
				// セッション取ってこれなかったら切断
				emitter(socket, 'announcement', {
					type: 'error',
					message: `session doesn't exist`,
					happen: 'proxy'
				}, true);
				return;
			}

			// 接続URL組み立て
			const endpoint: string = (() => {
				const base = `ws://${config.apiServerIp}:${config.apiServerPort}/streams/${name}?passkey=${config.apiPasskey}`;
				switch (name) {
					case 'talk': return `${base}&user-id=${session.userId}&otherparty-id=${socket.handshake.query['otherparty-id']}`;
					case 'group-talk': return `${base}&user-id=${session.userId}&otherparty-id=${socket.handshake.query['group-id']}`;
					default: return `${base}&user-id=${session.userId}`;
				}
			})();

			if (!(endpoint in connections)) {
				try {
					logInfo(`Connect upstream WebSocket stream: ${name} w/ user-id ${session.userId}`);
					// APIに接続
					connections[endpoint] = await connector(endpoint);
					// クローズ時に connections[endpoint] を削除する
					connections[endpoint].on('close', () => {
						logInfo(`Close upstream WebSocket stream: ${name} w/ user-id ${session.userId}`);
						delete connections[endpoint];
					});
				} catch (e) {
					emitter(socket, 'announcement', {
						type: 'error',
						message: `can't establish connection`,
						detail: e.toString(),
						happen: 'upstream'
					}, true);
					throw e;
				}
			}
			// connection に対してどれだけのクライアントがぶら下がっているかを記録
			if (!(endpoint in connectedCounts)) {
				connectedCounts[endpoint] = 0;
			}
			++connectedCounts[endpoint];

			/**
			 * ハンドラ生成・登録
			 */
			// なんらかのエラー
			const upstreamErrorEventHandler = (error: Error) => {
				emitter(socket, 'announcement', {
					type: 'error',
					message: `can't establish connection`,
					detail: error.toString(),
					happen: 'upstream'
				});
			};
			// 切断時
			const upstreamCloseEventHandler = (code: number, desc: string) => {
				emitter(socket, 'announcement', {
					type: 'error',
					message: 'close by upstream',
					detail: desc,
					happen: 'upstream'
				}, true);
			};
			// メッセージ受領 -> クライアントへ返答
			const upstreamMessageEventHandler = (data: WebSocket.IMessage) => {
				// UTF-8 メッセージでなければ処理しない
				if (!(data.type === 'utf8')) {
					return;
				}

				let message: IMessage;
				try {
					message = JSON.parse(data.utf8Data);
				} catch (e) {
					// JSONじゃねえ、クールに去るぜ・・・
					emitter(socket, 'announcement', {
						type: 'error',
						message: 'upstream returns non JSON data.',
						happen: 'upstream'
					}, true);
					return;
				}

				// upstremのエラーメッセージ
				if (message.type === 'error') {
					emitter(socket, 'announcement', {
						type: 'error',
						message: 'upstream error happned',
						detail: message.value.message,
						happen: 'upstream'
					}, true);
					return;
				}

				// おりゃ
				emitter(socket, message.type, message.value);
			};

			// ハンドラー登録
			connections[endpoint].on('error', upstreamErrorEventHandler);
			connections[endpoint].on('close', upstreamCloseEventHandler);
			connections[endpoint].on('message', upstreamMessageEventHandler);

			// socketの切断が合った場合にupstreamがどこからも利用されていなかったら正常に切断させる
			socket.on('disconnect', (reason: string) => {
				logInfo(`Diconnect Socket.IO stream: /streaming/${name} by ${reason}`);
				// ハンドラを削除
				connections[endpoint].removeListener('error', upstreamErrorEventHandler);
				connections[endpoint].removeListener('close', upstreamCloseEventHandler);
				connections[endpoint].removeListener('message', upstreamMessageEventHandler);
				// 誰からも利用されていないようならコネクションを削除
				if (1 > --connectedCounts[endpoint]) {
					connections[endpoint].close();
				}
			});
		});
	});
};
