import * as express from 'express';
import requestApi from '../../../../../core/request-api';
import ee from '../../../../common/ee';

module.exports = (req: express.Request, res: express.Response): void => {

	const query: string = req.query.q;

	ee(req, res, query);

	requestApi('posts/search', {
		'query': query
	}, req.user).then((posts: any[]) => {
		res.locals.display({
			query: query,
			posts: posts
		});
	});
};
