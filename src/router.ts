import * as cluster from 'cluster';
import * as express from 'express';
import * as path from 'path';
const accettare: any = require('accettare');
accettare.languages(['en', 'ja']);

import { User } from './models/user';
import { UserSettings, IUserSettings, guestUserSettings } from './models/user-settings';
import namingWorkerId from './core/naming-worker-id';
import requestApi from './core/request-api';
import login from './core/login';
import callController from './call-controller';
import config from './config';

const workerId: string = namingWorkerId(cluster.worker.id);

export default function router(app: express.Express): void {

	// Init session
	app.use((req: express.Request, res: express.Response, next) => {
		res.header('X-Frame-Options', `ALLOW-FROM ${config.publicConfig.url}`);
		res.header('X-XSS-Protection', '1; mode=block');
		res.header('X-Content-Type-Options', 'nosniff');

		// See http://web-tan.forum.impressrd.jp/e/2013/05/17/15269
		res.header('Vary', 'Accept-Language, User-Agent, Cookie');

		res.locals.isLogin =
			req.hasOwnProperty('session') &&
			req.session !== null &&
			req.session.hasOwnProperty('userId') &&
			(<any>req.session).userId !== null;

		function uatype(ua: string): string {
			if (ua !== undefined && ua !== null) {
				ua = ua.toLowerCase();
				if (/(iphone|ipod|ipad|android|windows.*phone|psp|vita|nitro|nintendo)/i.test(ua)) {
					return 'mobile';
				} else {
					return 'desktop';
				}
			} else {
				return 'desktop';
			}
		}

		const cookieLang: boolean = req.cookies['ui-language'];
		const browserAcceptLanguageString: string = req.headers['accept-language'] as string;

		const browserAcceptLanguage = browserAcceptLanguageString !== undefined && browserAcceptLanguageString !== null
			? accettare.get(browserAcceptLanguageString)
			: 'en';

		res.locals.config = config.publicConfig;
		res.locals.cookie = req.cookies;
		res.locals.pagePath = req.path;
		res.locals.noui = req.query.hasOwnProperty('noui');
		res.locals.login = res.locals.isLogin;
		res.locals.ua = uatype(req.headers['user-agent'] as string);
		res.locals.workerId = workerId;

		if (res.locals.isLogin) {
			const userId: string = (<any>req).session.userId;
			requestApi('account/show', {}, userId).then((user: User) => {
				UserSettings.findOne({
					userId: userId
				}, (err: any, settings: IUserSettings) => {
					const lang = settings.uiLanguage !== null
						? settings.uiLanguage
						: browserAcceptLanguage;
					req.user = Object.assign({}, user, {_settings: settings.toObject()});
					res.locals.me = user;
					res.locals.userSettings = settings.toObject();
					res.locals.locale = require(`${__dirname}/locales/${lang}.json`);
					res.locals.lang = lang;
					next();
				});
			}, (err: any) => {
				res.status(500).send('API error');
			});
		} else {
			const lang = cookieLang !== undefined
				? cookieLang
				: browserAcceptLanguage;
			req.user = null;
			res.locals.me = null;
			res.locals.userSettings = guestUserSettings;
			res.locals.locale = require(`${__dirname}/locales/${lang}.json`);
			res.locals.lang = lang;
			next();
		}
	});

	app.param('userScreenName', paramUserScreenName);
	app.param('postId', paramPostId);
	app.param('fileId', paramFileId);
	app.param('folderId', paramFolderId);
	app.param('talkGroupId', paramTalkGroupId);

	app.get('/', (req, res) => {
		if (res.locals.isLogin) {
			callController(req, res, 'home');
		} else {
			callController(req, res, 'entrance');
		}
	});

	app.get(`/subdomain/${config.publicConfig.registerDomain}/`, (req, res) => {
		if (res.locals.isLogin) {
			res.redirect(config.publicConfig.url);
		} else {
			callController(req, res, 'register');
		}
	});

	app.post(`/subdomain/${config.publicConfig.signinDomain}/`, (req, res) => {
		login(req.body['screen-name'], req.body['password'], req.session, req.headers, req.ip).then(() => {
			res.sendStatus(200);
		}, (err: any) => {
			res.status(err.statusCode).send(err.body);
		});
	});

	app.get(`/subdomain/${config.publicConfig.signinDomain}/`, (req, res) => {
		if (res.locals.isLogin) {
			res.redirect(config.publicConfig.url);
		} else {
			callController(req, res, 'login');
		}
	});

	app.get(`/subdomain/${config.publicConfig.signoutDomain}/`, (req, res) => {
		if (res.locals.isLogin) {
			req.session.destroy(() => {
				res.redirect(config.publicConfig.url);
			});
		} else {
			res.redirect(config.publicConfig.url);
		}
	});

	app.get('/terms-of-use', (req, res) => {
		callController(req, res, 'terms-of-use');
	});

	app.get(`/subdomain/${config.publicConfig.searchDomain}/`, (req, res) => {
		if (req.query.hasOwnProperty('q')) {
			callController(req, res, 'search/result');
		} else {
			callController(req, res, 'search/index');
		}
	});

	app.get(`/subdomain/${config.publicConfig.shareDomain}/`, (req, res) => {
		callController(req, res, 'share');
	});

	app.get(`/subdomain/${config.publicConfig.shareDomain}/script.js`, (req, res) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Credentials', 'false');
		res.sendFile(path.resolve(`${__dirname}/share/script.js`));
	});

	app.get(`/subdomain/${config.publicConfig.aboutDomain}/`, (req, res) => {
		callController(req, res, 'about');
	});

	app.get(`/subdomain/${config.publicConfig.aboutDomain}/license`, (req, res) => {
		callController(req, res, 'about/license');
	});

	app.get(`/subdomain/${config.publicConfig.aboutDomain}/technologies`, (req, res) => {
		callController(req, res, 'about/technologies');
	});

	app.get('/i/*', (req, res, next) => {
		if (res.locals.isLogin) {
			next();
		} else {
			callController(req, res, 'login');
		}
	});

	app.get('/i/post', (req, res) => {
		callController(req, res, 'i/post');
	});

	app.get('/i/mentions', (req, res) => {
		callController(req, res, 'i/mentions');
	});

	app.get('/i/notifications', (req, res) => {
		callController(req, res, 'i/notifications');
	});

	app.get(`/subdomain/${config.publicConfig.talkDomain}/`, (req, res) => {
		callController(req, res, 'i/talks');
	});

	app.get(`/subdomain/${config.publicConfig.talkDomain}/i/users`, (req, res) => {
		callController(req, res, 'i/talks/users');
	});

	app.get(`/subdomain/${config.publicConfig.talkDomain}/i/groups`, (req, res) => {
		callController(req, res, 'i/talks/groups');
	});

	app.get(`/subdomain/${config.publicConfig.talkDomain}/i/group/create`, (req, res) => {
		callController(req, res, 'i/talks/group/create');
	});

	app.get(`/subdomain/${config.publicConfig.talkDomain}/:userScreenName`, (req, res) => {
		callController(req, res, 'i/talk/user');
	});

	app.get(`/subdomain/${config.publicConfig.talkDomain}/\:group/:talkGroupId`,
		(req, res) => {
		callController(req, res, 'i/talk/group');
	});

	app.get('/i/album', (req, res) => {
		callController(req, res, 'i/album');
	});

	app.get('/i/album/file/:fileId', (req, res) => {
		callController(req, res, 'i/album/file');
	});

	app.get('/i/album/file/:fileId/edit-tag', (req, res) => {
		callController(req, res, 'i/album/file/edit-tag');
	});

	app.get('/i/album/folder/:folderId', (req, res) => {
		callController(req, res, 'i/album/folder');
	});

	app.get('/i/album/tags', (req, res) => {
		callController(req, res, 'i/album/tags');
	});

	app.get('/i/upload', (req, res) => {
		callController(req, res, 'i/upload');
	});

	app.get('/i/settings', (req, res) =>
		callController(req, res, 'i/settings'));

	app.get('/i/settings/avatar', (req, res) =>
		callController(req, res, 'i/settings/avatar'));

	app.get('/i/settings/banner', (req, res) =>
		callController(req, res, 'i/settings/banner'));

	app.get('/i/settings/comment', (req, res) =>
		callController(req, res, 'i/settings/comment'));

	app.get('/i/settings/location', (req, res) =>
		callController(req, res, 'i/settings/location'));

	app.get('/i/settings/name', (req, res) =>
		callController(req, res, 'i/settings/name'));

	app.get('/i/settings/tags', (req, res) =>
		callController(req, res, 'i/settings/tags'));

	app.get('/i/settings/website', (req, res) =>
		callController(req, res, 'i/settings/website'));

	app.get('/i/settings/ui-language', (req, res) =>
		callController(req, res, 'i/settings/ui-language'));

	app.get('/i/settings/display-image-quality', (req, res) =>
		callController(req, res, 'i/settings/display-image-quality'));

	app.get('/i/settings/push-notification', (req, res) =>
		callController(req, res, 'i/settings/push-notification'));

	app.get('/i/settings/mobile-header-overlay', (req, res) =>
		callController(req, res, 'i/settings/mobile-header-overlay'));

	app.get('/i/home-customize', (req, res) =>
		callController(req, res, 'i/home-customize'));

	app.get('/:userScreenName', (req, res) => {
		callController(req, res, 'user/home');
	});

	app.get('/:userScreenName/following', (req, res) => {
		callController(req, res, 'user/following');
	});

	app.get('/:userScreenName/followers', (req, res) => {
		callController(req, res, 'user/followers');
	});

	app.get('/:userScreenName/:postId', (req, res) => {
		callController(req, res, 'post');
	});

	// Not found handling
	app.use((req, res) => {
		res.status(404);
		callController(req, res, 'not-found');
	});

	// Error handlings

	app.use((err: any, req: express.Request, res: express.Response, next: (err: any) => void) => {
		if (err.code !== 'EBADCSRFTOKEN') {
			return next(err);
		}

		// handle CSRF token errors
		res.status(403);
		res.send('form tampered with');
	});

	app.use((err: any, req: express.Request, res: express.Response, next: () => void) => {
		console.error(err);
		callController(req, res, 'error', err);
	});
}

function paramUserScreenName(
	req: express.Request,
	res: express.Response,
	next: () => void,
	screenName: string
): void {

	requestApi('users/show', {
		'screen-name': screenName
	}, res.locals.isLogin ? req.user : null).then((user: User) => {
		if (user !== null) {
			res.locals.user = user;
			next();
		} else {
			res.status(404);
			callController(req, res, 'user-not-found');
		}
	}, (err: any) => {
		if (err.body === 'not-found') {
			res.status(404);
			callController(req, res, 'user-not-found');
		}
	});
}

function paramPostId(
	req: express.Request,
	res: express.Response,
	next: () => void,
	postId: string
): void {

	requestApi('posts/show', {
		'post-id': postId
	}, res.locals.isLogin ? req.user : null).then((post: Object) => {
		if (post !== null) {
			res.locals.post = post;
			next();
		} else {
			res.status(404);
			callController(req, res, 'post-not-found');
		}
	}, (err: any) => {
		if (err.body === 'not-found') {
			res.status(404);
			callController(req, res, 'post-not-found');
		}
	});
}

function paramFileId(
	req: express.Request,
	res: express.Response,
	next: () => void,
	fileId: string
): void {

	requestApi('album/files/show', {
		'file-id': fileId
	}, res.locals.isLogin ? req.user : null).then((file: Object) => {
		res.locals.file = file;
		next();
	}, (err: any) => {
		if (err.body === 'not-found') {
			res.status(404);
			callController(req, res, 'i/album/file-not-found');
		}
	});
}

function paramFolderId(
	req: express.Request,
	res: express.Response,
	next: () => void,
	folderId: string
): void {

	requestApi('album/folders/show', {
		'folder-id': folderId
	}, res.locals.isLogin ? req.user : null).then((folder: Object) => {
		res.locals.folder = folder;
		next();
	}, (err: any) => {
		if (err.body === 'not-found') {
			res.status(404);
			callController(req, res, 'i/album/folder-not-found');
		}
	});
}

function paramTalkGroupId(
	req: express.Request,
	res: express.Response,
	next: () => void,
	groupId: string
): void {

	requestApi('talks/group/show', {
		'group-id': groupId
	}, req.user).then((group: Object) => {
		res.locals.talkGroup = group;
		next();
	}, (err: any) => {
		res.sendStatus(500);
	});
}
