import * as express from 'express';
import requestApi from '../../../../../core/request-api';

module.exports = (req: express.Request, res: express.Response): void => {

	requestApi('notifications/timeline', {
		'limit': 30
	}, req.app.locals.user).then((notifications: any[]) => {
		res.locals.display({
			notifications: notifications
		});
	});
};
