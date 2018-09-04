import requestApi from '../core/request-api';
import { UserSettings, IUserSettings } from '../models/user-settings';

export default function login(screenName: string, password: string, session: any, headers: any, ip: any): Promise<void> {

	return new Promise<void>((resove, reject) => {
		requestApi('login', {
			'screen-name': screenName,
			'password': password
		}).then((user: any) => {
			// ユーザー設定引き出し
			UserSettings.findOne({
				userId: user.id
			}, (err: any, settings: IUserSettings) => {
				if (err !== null) {
					return reject(err);
				}
				if (settings === null) {
					// ユーザー設定が無ければ作成
					UserSettings.create({
						userId: user.id
					}, (createErr: any, created: IUserSettings) => {
						saveSession(user);
					});
				} else {
					saveSession(user);
				}
			});
		}, (err: any) => {
			reject(err);
		});

		function saveSession(user: any): void {
			session.userId = user.id;
			session.user = user.screenName;
			session.proxy = headers['x-forwarded-for'] || null;
			session['user-agent'] = headers['user-agent'] || null;
			session.time = Date.now();
			session.ip = ip;
			session.save(() => {
				resove();
			});
		}
	});
}
