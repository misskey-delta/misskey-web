const pug: any = require('pug');

import { User } from '../../../models/user';
import { Post } from '../../../models/post';
import requestApi from '../../../core/request-api';

import config from '../../../config';

/**
 * @param tlsource 'home' or 'mentions'
 */
export default function generateHomewidgetTimeline(me: User, locale: any, tlsource: string): Promise<string> {

	const compiler: (locals?: any) => string = pug.compileFile(
		`${__dirname}/views/home-widgets/timeline.pug`, {
			cache: true
	});

	return new Promise<string>((resolve, reject) => {
		switch (tlsource) {
			case 'home':
				requestApi('posts/timeline', { 'limit': 10 }, me.id).then((tl: Post[]) => {
					resolve(compile(tl));
				}, reject);
				break;
			case 'mentions':
				requestApi('posts/mentions/show', { 'limit': 10 }, me.id).then((tl: Post[]) => {
					resolve(compile(tl));
				}, reject);
				break;
			default:
				break;
		}

		function compile(tl: any): string {
			return compiler({
				posts: tl,
				me: me,
				userSettings: me._settings,
				locale: locale,
				config: config.publicConfig
			});
		}
	});
}
