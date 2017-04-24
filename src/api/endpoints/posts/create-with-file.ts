import * as fs from 'fs';
import * as express from 'express';
import requestApi from '../../../core/request-api';

export default function createWithFile(req: express.Request, res: express.Response): void {
	const emojinize = require("@misskey/emojinize");

	const file: Express.Multer.File = (<any>req).file;
	if (file !== undefined && file !== null) {
		const data: any = {};
		data.file = {
			value: fs.readFileSync(file.path),
			options: {
				filename: file.originalname,
				contentType: file.mimetype
			}
		};
		fs.unlinkSync(file.path);
		requestApi('album/files/upload', data, req.user, true).then((albumFile: Object) => {
			create(albumFile);
		}, (err: any) => {
			console.error(err);
			res.status(500).send(err);
		});
	} else {
		create();
	}

	function create(fileEntity: any = null): void {
		const inReplyToPostId = req.body['in-reply-to-post-id'];
		if (inReplyToPostId !== undefined && inReplyToPostId !== null && inReplyToPostId !== '') {
			requestApi('posts/reply', {
				'text': emojinize(req.body.text),
				'files': fileEntity !== null ? fileEntity.id : null,
				'in-reply-to-post-id': inReplyToPostId
			}, req.user).then((post: Object) => {
				res.send(post);
			}, (err: any) => {
				res.status(500).send(err);
			});
		} else {
			requestApi('posts/create', {
				'text': emojinize(req.body.text),
				'files': fileEntity !== null ? fileEntity.id : null
			}, req.user).then((post: Object) => {
				res.send(post);
			}, (err: any) => {
				res.status(500).send(err);
			});
		}
	}
}
