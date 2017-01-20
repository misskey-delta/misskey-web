import * as express from 'express';
import requestApi from '../../../../../../core/request-api';

module.exports = (req: express.Request, res: express.Response): void => {

	requestApi('talks/history/show', {
		type: 'group'
	}, res.locals.user.id).then((messages: any[]) => {
		requestApi('talks/group/invitations/show', {}, res.locals.user.id).then((invitations: any[]) => {
			res.locals.display({
				messages: messages,
				invitations: invitations
			});
		});
	});
};
