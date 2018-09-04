import * as express from 'express';
import { User } from '../../../../../models/user';
import requestApi from '../../../../../core/request-api';

module.exports = (req: express.Request, res: express.Response): void => {

	const user: User = res.locals.user;
	const me: User = req.user;

	requestApi('posts/user-timeline', {
		'user-id': user.id,
		'include-replies': false
	}, me)
		.then((timeline: any[]) => {
			res.locals.display({
				user,
				timeline
			}, 'user');
		});
};
