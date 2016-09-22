import * as express from 'express';
import * as URL from 'url';
import * as request from 'request';
const jade: any = require('jade');

// only for analyzeNicovideo
const xml2json = require('xml2json');
const numeral = require('numeral');

const client: any = require('cheerio-httpcli');
client.headers['User-Agent'] = 'MisskeyBot';
client.referer = false;
client.timeout = 10000;

const Entities: any = require('html-entities').AllHtmlEntities;
const entities = new Entities();

import config from '../../../config';

/**
 * 指定されたURLのページのプレビューウィジェットを生成します。
 * @param req MisskeyExpressRequest
 * @param res MisskeyExpressResponse
 */
export default function analyze(req: express.Request, res: express.Response): void {

	const urlStr: string = req.body.url;
	const url: URL.Url = URL.parse(urlStr, true);

	res.header('Content-Type', 'text/plain');

	switch (url.hostname) {
		case 'ja.wikipedia.org':
		case 'en.wikipedia.org':
			analyzeWikipedia(req, res, url);
			break;
		case 'ja.m.wikipedia.org':
		case 'en.m.wikipedia.org':
			analyzeMobileWikipedia(req, res, url);
			break;
		case 'www.youtube.com':
		case 'youtube.com':
		case 'youtu.be':
			analyzeYoutube(req, res, url);
			break;
		case 'soundcloud.com':
			analyzeSoundcloud(req, res, url);
			break;
		case 'gyazo.com':
			analyzeGyazo(req, res, url);
			break;
		case 'gist.github.com':
			analyzeGithubGist(req, res, url);
			break;
		case 'nico.ms':
		case 'www.nicovideo.jp':
		case 'nicovideo.jp':
		case 'sp.nicovideo.jp':
		case 'seiga.nicovideo.jp':
			allocateNicovideoURL(req, res, url);
			break;
		case 'yabumi.cc':
			analyzeYabumi(req, res, url);
			break;
		case 'imgur.com':
		case 'm.imgur.com':
		case 'i.imgur.com':
			analyzeImgur(req, res, url);
			break;
		default:
			analyzeGeneral(req, res, url);
			break;
	}
}

function showImage(res: express.Response, src: string, href: string): void {

	const compiler: (locals: any) => string = jade.compileFile(
		`${__dirname}/image.jade`);

	const image: string = compiler({
		src,
		href
	});

	res.send(image);
}

function analyzeWikipedia(req: express.Request, res: express.Response, url: URL.Url): void {

	const title: string = decodeURI(url.pathname.split('/')[2]);

	client.fetch(url.href).then((result: any) => {
		if (result.error !== undefined && result.error !== null) {
			return res.sendStatus(500);
		}

		const $: any = result.$;

		const text: string = $('#mw-content-text > p:first-of-type').text();

		// Favicon
		const icon: string = URL.resolve(url.href, $('link[rel="shortcut icon"]').attr('href'));

		const compiler: (locals: any) => string = jade.compileFile(
			`${__dirname}/summary.jade`);

		const viewer = compiler({
			url: url,
			title,
			icon,
			description: text,
			image: 'https://ja.wikipedia.org/static/images/project-logos/enwiki.png',
			siteName: 'Wikipedia'
		});

		res.send(viewer);
	}, (err: any) => {
		res.sendStatus(204);
	});
}

function analyzeMobileWikipedia(req: express.Request, res: express.Response, url: URL.Url): void {

	const title: string = decodeURI(url.pathname.split('/')[2]);

	client.fetch(url.href).then((result: any) => {
		if (result.error !== undefined && result.error !== null) {
			return res.sendStatus(500);
		}

		const $: any = result.$;

		const text: string = $('#bodyContent > div:first-of-type > p:first-of-type').text();

		// Favicon
		const icon: string = URL.resolve(url.href, $('link[rel="shortcut icon"]').attr('href'));

		const compiler: (locals: any) => string = jade.compileFile(
			`${__dirname}/summary.jade`);

		const viewer = compiler({
			url: url,
			title,
			icon,
			description: text,
			image: 'https://ja.wikipedia.org/static/images/project-logos/enwiki.png',
			siteName: 'Wikipedia'
		});

		res.send(viewer);
	}, (err: any) => {
		res.sendStatus(204);
	});
}

function analyzeYoutube(req: express.Request, res: express.Response, url: URL.Url): void {

	function getVideoId(): string {

		switch (url.hostname) {
			case 'www.youtube.com':
			case 'youtube.com':
				return url.query.v;
			case 'youtu.be':
				return url.pathname;
			default:
				return null;
		}
	}

	const videoId = getVideoId();

	const compiler: (locals: any) => string = jade.compileFile(
		`${__dirname}/youtube.jade`);

	const player: string = compiler({
		videoId
	});

	res.send(player);
}

function analyzeSoundcloud(req: express.Request, res: express.Response, url: URL.Url): void {

	request({
		url: 'http://soundcloud.com/oembed',
		method: 'get',
		qs: {
			format: 'json',
			url: url.href
		}
	}, (err, response, body) => {
		if (err !== null) {
			return res.sendStatus(204);
		} else if (response.statusCode !== 200) {
			return res.sendStatus(204);
		} else {
			const parsed: any = JSON.parse(body);
			const html: string = parsed.html;
			const display = html.replace('height="400"', 'height="200"');
			res.send(display);
		}
	});
}

function analyzeGithubGist(req: express.Request, res: express.Response, url: URL.Url): void {

	client.fetch(url.href).then((result: any) => {
		if (result.error !== undefined && result.error !== null) {
			return res.sendStatus(204);
		}

		const $: any = result.$;

		const avatarUrl: string = $('meta[property="og:image"]').attr('content');
		const userName: string = $('meta[name="octolytics-dimension-owner_login"]').attr('content');
		const fileName: string = $('.gist-header-title > a').text();
		const description: string = $('meta[property="og:description"]').attr('content');
		const $rawButton = $('#gist-pjax-container .js-gist-file-update-container > .file > .file-header > .file-actions > .btn');
		const resolvedRawUrl = URL.resolve('https://gist.githubusercontent.com', $rawButton.attr('href'));

		request(resolvedRawUrl, (getRawErr: any, getRawResponse: any, raw: any) => {
			if (getRawErr !== null) {
				return res.sendStatus(204);
			} else if (getRawResponse.statusCode !== 200) {
				return res.sendStatus(204);
			} else {
				const compiler: (locals: any) => string = jade.compileFile(
					`${__dirname}/gist.jade`);

				const viewer: string = compiler({
					url: url.href,
					avatarUrl,
					userName,
					fileName,
					description,
					raw
				});

				res.send(viewer);
			}
		});
	});
}

function analyzeGyazo(req: express.Request, res: express.Response, url: URL.Url): void {

	const imageId: string = url.pathname.substring(1);
	const src: string = `https://i.gyazo.com/${imageId}.png`;

	showImage(res, src, url.href);
}

function analyzeYabumi(req: express.Request, res: express.Response, url: URL.Url): void {

	const imageId: string = url.pathname.substring(1);
	const src: string = `https://yabumi.cc/api/images/${imageId}`;

	showImage(res, src, url.href);
}

function analyzeImgur(req: express.Request, res: express.Response, url: URL.Url): void {

	if (url.hostname === 'i.imgur.com') {
		showImage(res, wrapMisskeyProxy(url.href), url.href);
	} else {
		// リクエスト送信
		client.fetch(url.href).then((result: any) => {
			if (result.error !== undefined && result.error !== null) {
				return res.sendStatus(204);
			}

			const contentType: string = result.response.headers['content-type'];
			// HTMLじゃなかった場合は中止
			if (contentType.indexOf('text/html') === -1) {
				return res.sendStatus(204);
			}

			const $: any = result.$;
			let src = or(
				$('meta[property="misskey:image"]').attr('content'),
				$('meta[property="og:image"]').attr('content'),
				$('meta[property="twitter:image"]').attr('content'),
				$('link[rel="image_src"]').attr('href'),
				$('link[rel="apple-touch-icon"]').attr('href'),
				$('link[rel="apple-touch-icon image_src"]').attr('href'));
			if (src === null) {
				return res.sendStatus(204);
			}

			showImage(res, wrapMisskeyProxy(src.replace(URL.parse(src).search, "")), url.href);
		}, (err: any) => {
			res.sendStatus(204);
		});
	}
}

function allocateNicovideoURL(req: express.Request, res: express.Response, url: URL.Url): void {

	// ID取得
	function getVideoId(): string {

		switch (url.hostname) {
			case 'sp.nicovideo.jp':
			case 'www.nicovideo.jp':
			case 'nicovideo.jp':
				return url.pathname.substr(0, 7) === "/watch/" ? url.pathname.substring(7) : null;
			case 'nico.ms':
				return url.pathname.match(/^(\/sm|\/so|\/nm|\/)([0-9]+)$/) ? url.pathname.substring(1) : null;
			default:
				return null;
		}

	}

	const videoId = getVideoId();

	// 動画判定
	if (videoId !== null) {
		analyzeNicovideo(req, res, url, videoId);
		return;
	}

	// 静画
	let imageId: string = null;

	switch (url.hostname) {
		case 'seiga.nicovideo.jp':
			imageId = url.pathname.substr(0, 9) === "/seiga/im" ? url.pathname.substring(9) : null;
			break;
		case 'nico.ms':
			imageId = url.pathname.match(/^\/im([0-9]+)$/) ? url.pathname.substring(3) : null;
			break;
		default:
			break;
	}

	if (imageId !== null) {
		showImage(res, wrapMisskeyProxy("http://lohas.nicoseiga.jp/thumb/" + imageId + "l"), url.href);
		return;
	}

	analyzeGeneral(req, res, url);
}

function analyzeNicovideo(req: express.Request, res: express.Response, url: URL.Url, videoId: string): void {

	// データ取得関数
	function fetchUrlByRequest(fetchUrl: string): any {
		return new Promise((resolve, reject) => {
			request(fetchUrl, (error, responce, body) => {
				if (!error && responce.statusCode === 200) {
					resolve(body);
				} else {
					reject(error);
				}
			});
		});
	}

	const getThumbInfoUrl = 'http://ext.nicovideo.jp/api/getthumbinfo/' + videoId;
	const getVideoInfoUrl = 'http://api.ce.nicovideo.jp/nicoapi/v1/video.info?__format=json&v=' + videoId;
	const promises = [fetchUrlByRequest(getVideoInfoUrl), fetchUrlByRequest(getThumbInfoUrl)];

	// 宣言
	const siteName = 'ニコニコ動画';
	const icon = wrapMisskeyProxy('http://www.nicovideo.jp/favicon.ico');
	let title = '未知の動画情報';
	let description = '動画情報を取得できませんでした';
	let image = wrapMisskeyProxy('http://deliver.commons.nicovideo.jp/thumbnail/nc3132');
	let tag: String;
	let viewCount: String;
	let length: String;
	let myListCounter: String;
	let commentNum: String;
	let state: String;
	let userNickname: String;
	let category: String;
	let rawUploadTime: Date;
	let uploadyyyymmdd: String;
	let uploadhhmmss: String;

	// データ取得
	Promise.all(promises).then((results) => {

		// 変換
		const resVideoApi = JSON.parse(results[0]).nicovideo_video_response;
		const resThumbApi = JSON.parse(xml2json.toJson(results[1])).nicovideo_thumb_response;

		// APIエラー
		if (resVideoApi['@status'] === 'fail' && resThumbApi.status === 'fail') {
			// エラー内容判別
			switch (resThumbApi.error.code) {
				case 'DELETED':
					title = '非公開か削除済の動画';
					break;
				case 'NOT_FOUND':
					title = '存在しない動画';
					break;
				default:
					break;
			}

			// APIエラーコード
			description = 'APIエラーコード: ' +  resThumbApi.error.code;
		// 削除済
		} else if (resVideoApi['@status'] === 'ok' && resThumbApi.status === 'fail') {
			// 情報代入
			state = resVideoApi.video.deleted === '1'
				? '削除済み'
				: null;
			description = resVideoApi.video.description === '&nbsp;'
				? null
				: resVideoApi.video.description === '　'
				? null
				: resVideoApi.video.description === null
				? null
				: resVideoApi.video.description;
			title = resVideoApi.video.title;
			image = resVideoApi.video.deleted === '1'
				? wrapMisskeyProxy('http://res.nimg.jp/img/common/video_deleted.jpg')
				: resVideoApi.video.options['@large_thumbnail'] === '1'
				? wrapMisskeyProxy(resVideoApi.video.thumbnail_url + '.L')
				: wrapMisskeyProxy(resVideoApi.video.thumbnail_url);
			tag = typeof resVideoApi.tags.tag_info.tag === 'undefined'
				? resVideoApi.tags.tag_info[0].tag
				: resVideoApi.tags.tag_info.tag;
			viewCount = numeral(resVideoApi.video.view_counter).format('0,0');
			myListCounter = numeral(resVideoApi.video.mylist_counter).format('0,0');
			commentNum = numeral(resVideoApi.thread.num_res).format('0,0');
			rawUploadTime = resVideoApi.video.first_retrieve;
			uploadyyyymmdd = `${rawUploadTime.getFullYear()}年` +
				`${(rawUploadTime.getMonth() + 1)}月` +
				`${rawUploadTime.getDate()}日`;
			uploadhhmmss = `${rawUploadTime.getHours()}時` +
				`${rawUploadTime.getMinutes()}分` +
				`${rawUploadTime.getSeconds()}秒`;
		// 成功
		} else if (resVideoApi['@status'] === 'ok' && resThumbApi.status === 'ok') {
			// 情報代入
			state = resVideoApi.video.deleted === '1'
				? '削除済み'
				: null;
			description = resVideoApi.video.description === '&nbsp;'
				? null
				: resVideoApi.video.description === '　'
				? null
				: resVideoApi.video.description === null
				? null
				: resVideoApi.video.description;
			title = resVideoApi.video.title;
			image = resVideoApi.video.deleted === '1'
				? wrapMisskeyProxy('http://res.nimg.jp/img/common/video_deleted.jpg')
				: resVideoApi.video.options['@large_thumbnail'] === '1'
				? wrapMisskeyProxy(resVideoApi.video.thumbnail_url + '.L')
				: wrapMisskeyProxy(resVideoApi.video.thumbnail_url);
			viewCount = numeral(resVideoApi.video.view_counter).format('0,0');
			myListCounter = numeral(resVideoApi.video.mylist_counter).format('0,0');
			commentNum = numeral(resVideoApi.thread.num_res).format('0,0');
			length = resThumbApi.thumb.length;
			userNickname = resThumbApi.thumb.user_nickname;
			if (typeof resThumbApi.thumb.tags.tag) {
				const categoryAny = resThumbApi.thumb.tags.tag.find((tags: any) => { return tags.category === '1'; });
				category = typeof categoryAny !== 'undefined'
					? categoryAny.$t
					: null;
			}
			rawUploadTime = resVideoApi.video.first_retrieve;
			uploadyyyymmdd = `${rawUploadTime.getFullYear()}年` +
				`${(rawUploadTime.getMonth() + 1)}月` +
				`${rawUploadTime.getDate()}日`;
			uploadhhmmss = `${rawUploadTime.getHours()}時` +
				`${rawUploadTime.getMinutes()}分` +
				`${rawUploadTime.getSeconds()}秒`;
		}

		const compiler: (locals: any) => string = jade.compileFile(
			`${__dirname}/nicovideo.jade`);

		const viewer = compiler({
			url: url,
			siteName: siteName,
			icon: icon,
			title: title,
			description: description,
			image: image,
			category: category,
			tag: tag,
			viewCount: viewCount,
			length: length,
			myListCounter: myListCounter,
			commentNum: commentNum,
			state: state,
			userNickname: userNickname,
			uploadyyyymmdd: uploadyyyymmdd,
			uploadhhmmss: uploadhhmmss
		});

		res.send(viewer);
	}).catch(() => {
		return res.sendStatus(204);
	});
}
/**
 * @param req MisskeyExpressRequest
 * @param res MisskeyExpressResponse
 * @param url url
 */
function analyzeGeneral(req: express.Request, res: express.Response, url: URL.Url): void {

	// リクエスト送信
	client.fetch(url.href).then((result: any) => {
		if (result.error !== undefined && result.error !== null) {
			return res.sendStatus(204);
		}

		const contentType: string = result.response.headers['content-type'];

		// HTMLじゃなかった場合は中止
		if (contentType.indexOf('text/html') === -1) {
			return res.sendStatus(204);
		}

		const $: any = result.$;

		let title = or(
			$('meta[property="misskey:title"]').attr('content'),
			$('meta[property="og:title"]').attr('content'),
			$('meta[property="twitter:title"]').attr('content'),
			$('title').text());
		if (title === null) {
			return res.sendStatus(204);
		}
		title = clip(entities.decode(title), 100);

		const lang: string = $('html').attr('lang');

		const type = or(
			$('meta[property="misskey:type"]').attr('content'),
			$('meta[property="og:type"]').attr('content'));

		let image = or(
			$('meta[property="misskey:image"]').attr('content'),
			$('meta[property="og:image"]').attr('content'),
			$('meta[property="twitter:image"]').attr('content'),
			$('link[rel="image_src"]').attr('href'),
			$('link[rel="apple-touch-icon"]').attr('href'),
			$('link[rel="apple-touch-icon image_src"]').attr('href'));
		image = image !== null ? wrapMisskeyProxy(URL.resolve(url.href, image)) : null;

		let description = or(
			$('meta[property="misskey:summary"]').attr('content'),
			$('meta[property="og:description"]').attr('content'),
			$('meta[property="twitter:description"]').attr('content'),
			$('meta[name="description"]').attr('content'));
		description = description !== null
			? clip(entities.decode(description), 300)
			: null;

		if (title === description) {
			description = null;
		}

		let siteName = or(
			$('meta[property="misskey:site-name"]').attr('content'),
			$('meta[property="og:site_name"]').attr('content'),
			$('meta[name="application-name"]').attr('content'));
		siteName = siteName !== null ? entities.decode(siteName) : null;

		let icon = or(
			$('meta[property="misskey:site-icon"]').attr('content'),
			$('link[rel="shortcut icon"]').attr('href'),
			$('link[rel="icon"]').attr('href'),
			'/favicon.ico');
		icon = icon !== null ? wrapMisskeyProxy(URL.resolve(url.href, icon)) : null;

		const compiler: (locals: any) => string = jade.compileFile(
			`${__dirname}/summary.jade`);

		// コンパイル
		const viewer: string = compiler({
			url: url,
			title: title,
			icon: icon,
			lang: lang,
			description: description,
			type: type,
			image: image,
			siteName: siteName
		});

		res.send(viewer);
	}, (err: any) => {
		res.sendStatus(204);
	});
}

function wrapMisskeyProxy(url: string): string {
	return `${config.publicConfig.shieldUrl}/${url}`;
}

/**
 * 文字列が空かどうかを判定します。
 * @param val: 文字列
 */
function nullOrEmpty(val: string): boolean {

	if (val === undefined) {
		return true;
	} else if (val === null) {
		return true;
	} else if (val.trim() === '') {
		return true;
	} else {
		return false;
	}
}

function or(...xs: string[]): string {

	for (let i = 0; i < xs.length; i++) {
		const x = xs[i];
		if (!nullOrEmpty(x)) {
			return x;
		}
	}

	return null;
}

function clip(s: string, max: number): string {

	if (nullOrEmpty(s)) {
		return s;
	}

	s = s.trim();

	if (s.length > max) {
		return s.substr(0, max) + '...';
	} else {
		return s;
	}
}
