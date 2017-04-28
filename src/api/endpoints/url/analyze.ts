import * as express from 'express';
import * as URL from 'url';
import * as request from 'request';
import * as mongoose from 'mongoose';
import tracer from 'trace-redirect';
import summaly from 'summaly';
const pug: any = require('pug');

const client: any = require('cheerio-httpcli');
client.headers['User-Agent'] = 'MisskeyBot';
client.headers['Accept-Language'] = 'ja-JP,ja,en-US;q=0.8,en;q=0.6';
client.referer = false;
client.timeout = 10000;

const Entities: any = require('html-entities').AllHtmlEntities;
const entities = new Entities();

import analyzeStore from '../../../models/analyze-store';

import config from '../../../config';

/**
 * 指定されたURLのページのプレビューウィジェットを生成します。
 * @param req MisskeyExpressRequest
 * @param res MisskeyExpressResponse
 */
export default (req: express.Request, res: express.Response): void => {
	if (! req.query.url) {
		res.status(400).send({
			message: "no url header specified."
		});
		return;
	}

	// trace address (resolve redirects)
	tracer(req.query.url).then(href => {
		const url: URL.Url = URL.parse(href, true);
		// check db & crawl
		analyzer(url).then(result => {
			const date = result[0];
			const html = result[1];
			// set cache headers
			res.set('Cache-Control', 'public');
			res.set('Last-Modified', date.toUTCString());
			res.set('Expires', new Date(date.getTime() + 1000 * 60 * 60).toUTCString());
			// send
			res.send(html);
		}).catch(e => {
			console.log(e.stack);
			res.status(500).send({
				message: "a crawling error happen."
			});
		});
	});
};

async function analyzer(url: URL.Url): Promise<[Date, string]> {
	// call custom analyzers
	const custom = async (crawlURL: URL.Url) => {
		switch (crawlURL.hostname) {
			case 'gyazo.com':
				return analyzeGyazo(crawlURL);
			case 'yabumi.cc':
				return analyzeYabumi(crawlURL);
			case 'imgur.com':
			case 'm.imgur.com':
			case 'i.imgur.com':
				return await analyzeImgur(crawlURL);
			default:
				return null;
		}
	};

	try {
		// get from database
		const document: mongoose.Document = await analyzeStore.findOne({
			url: url.href
		});
		const documentCreationTime: Date = document._id.getTimestamp();
		// if 1 hours elapsed, remove & throw error
		const oneHoursAgo = Date.now() - (1000 * 60 * 60);
		if (documentCreationTime.getTime() < oneHoursAgo) {
			document.remove();
			throw new Error('old-cache');
		}
		const dObj: any = document.toObject();
		return [documentCreationTime, dObj.html];
	} catch (e) {
		// crawl a website
		const data = await custom(url) || await analyzeGeneral(url);
		if (! data) {
			throw new Error("no-data");
		}
		const document = new analyzeStore({
			url: url.href,
			html: data
		});
		document.save();
		return [document._id.getTimestamp(), data];
	}
}

function showImage(src: string, href: string): string {
	const compiler: (locals: any) => string = pug.compileFile(
		`${__dirname}/image.pug`);

	const image: string = compiler({
		src,
		href
	});

	return image;
}

function analyzeGyazo(url: URL.Url): string {
	const imageId: string = url.pathname.substring(1);
	const src: string = `https://i.gyazo.com/${imageId}.png`;

	return showImage(src, url.href);
}

function analyzeYabumi(url: URL.Url): string {
	const imageId: string = url.pathname.substring(1);
	const src: string = `https://yabumi.cc/api/images/${imageId}`;

	return showImage(src, url.href);
}

async function analyzeImgur(url: URL.Url): Promise<string> {
	// i.imgur.comだったらリクエストを送らずともわかる
	if (url.hostname === 'i.imgur.com') {
		return showImage(wrap(url.href), url.href);
	}

	// リクエスト送信
	const result = await client.fetch(url.href);

	if (result.error !== undefined && result.error !== null) {
		throw new Error("crawl-error");
	}

	// HTMLじゃなかった場合は中止
	const contentType: string = result.response.headers['content-type'];
	if (! contentType || contentType.indexOf('text/html') === -1) {
		throw new Error("crawl-error-not-html");
	}

	const $: any = result.$;
	let src = or(
		$('meta[property="misskey:image"]').attr('content'),
		$('meta[property="og:image"]').attr('content'),
		$('meta[property="twitter:image"]').attr('content'),
		$('link[rel="image_src"]').attr('href'),
		$('link[rel="apple-touch-icon"]').attr('href'),
		$('link[rel="apple-touch-icon image_src"]').attr('href'));
	if (! src) {
		throw new Error("crawl-error-empty-src");
	}
	return showImage(wrap(src.replace(URL.parse(src).search, "")), url.href);
}

/**
 * @param req MisskeyExpressRequest
 * @param res MisskeyExpressResponse
 * @param url url
 */
async function analyzeGeneral(url: URL.Url): Promise<string> {
	const summary = await summaly(url.href);

	const compiler: (locals: any) => string = pug.compileFile(
		`${__dirname}/summary.pug`);

	// コンパイル
	const viewer: string = compiler({
		url: url,
		title: summary.title,
		icon: wrap(summary.icon),
		description: summary.description,
		image: wrap(summary.thumbnail),
		siteName: summary.sitename
	});

	return viewer;
}

function wrap(url: string): string {
	return `https://images.weserv.nl/?url=${url.replace(/^.*:\/\//, '')}`;
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
