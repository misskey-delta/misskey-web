import * as express from 'express';
import requestApi from '../../../core/request-api';

export default function reply(req: express.Request, res: express.Response): void {

	requestApi('posts/reply', {
		'in-reply-to-post-id': req.body['in-reply-to-post-id'],
		'text': req.body['text'],
		'files': req.body['files']
	}, req.user).then((replyedPost: Object) => {
		res.send(replyedPost);
	}, (err: any) => {
		res.send(err);
	});
}
