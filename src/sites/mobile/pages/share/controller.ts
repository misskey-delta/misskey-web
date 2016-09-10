import * as express from 'express';

module.exports = (req: express.Request, res: express.Response): void => {

	res.locals.display({
		title: req.query.title,
		url: req.query.url,
	});
};
