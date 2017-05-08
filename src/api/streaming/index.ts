import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as session from 'express-session';
import * as SocketIO from 'socket.io';
import * as cookie from 'cookie';
import * as mongoose from 'mongoose';
import * as MongoStore from 'connect-mongo';
import * as WebSocket from 'websocket';
const _MongoStore: MongoStore.MongoStoreFactory = MongoStore(session);
import config from '../../config';
import db from '../../db';
import endpoints from './endpoints';
import {logInfo} from 'log-cool';

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
		if (! session) {
			rej(new Error('session is null'));
		}
		res(session);
	});
});

const emitter = (socket: SocketIO.Socket, event: string, data: {[key: string]: string}, close?: boolean) => {
	socket.emit(event, data);
	if (close) {
		socket.disconnect(true);
	}
};

export default (server: http.Server | https.Server): void => {
	const io: SocketIO.Server = SocketIO.listen(server);

	endpoints.forEach(name => {
		io.of(`/streaming/${name}`).on('connection', async (socket: SocketIO.Socket) => {
			logInfo(`Request API: Socket.IO stream /streaming/${name}`);
			// クッキーが無い場合切断
			if (! socket.handshake.headers.cookie) {
				emitter(socket, 'announcement', {
					type: 'error',
					message: `cookie doesn't exist`,
					happen: 'proxy'
				}, true);
				return;
			}
			const cookies: { [key: string]: string } = cookie.parse(socket.handshake.headers.cookie);
			// cookieに必要情報が無い場合切断
			if (! cookies[config.sessionKey] && ! /s:(.+?)\./.test(cookies[config.sessionKey])) {
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

			// APIのWebSocket
			const client = new WebSocket.client();

			// 接続できなかったら切断
			client.on('connectFailed', (error) => {
				emitter(socket, 'announcement', {
					type: 'error',
					message: `can't connection to upstream server`,
					happen: 'proxy'
				}, true);
			});

			client.on('connect', (upstream) => {
				// なんらかのエラー
				upstream.on('error', (error) => {
					emitter(socket, 'announcement', {
						type: 'error',
						message: `can't establish connection`,
						detail: error.toString(),
						happen: 'upstream'
					});
				});

				// 切断
				upstream.on('close', (code, desc) => {
					emitter(socket, 'announcement', {
						type: 'error',
						message: 'close by upstream',
						detail: desc,
						happen: 'upstream'
					}, true);
				});

				// メッセージ受領 -> クライアントへ返答
				upstream.on('message', (data) => {
					// UTF-8 メッセージでなければ処理しない
					if (! (data.type === 'utf8')) {
						return;
					}

					let message: IMessage;
					try {
						message = JSON.parse(data.utf8Data);
					} catch (e) {
						// JSONじゃねえ、クールに去るぜ・・・
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
				});
			});

			// APIに接続
			client.connect(`ws://${config.apiServerIp}:${config.apiServerPort}/streams/${name}`
				+ `?passkey=${config.apiPasskey}&user-id=${session.userId}`);
		});
	});
};
