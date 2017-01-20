import * as express from 'express';
import requestApi from '../../../../../../core/request-api';

module.exports = (req: express.Request, res: express.Response): void => {

	// const me = req.app.locals.user;
	const otherparty = res.locals.user;

	requestApi('talks/messages/stream', {
		'user-id': otherparty.id
	}, req.app.locals.user.id).then((messages: any[]) => {
		res.locals.display({
			otherparty: otherparty,
			messages: messages.reverse()
		});
	});
};
