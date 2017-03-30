import * as express from 'express';
import { UserSettings, IUserSettings } from '../../../models/user-settings';

export default function updateHomeLayout(req: express.Request, res: express.Response): void {

	const layoutString: string = req.body['layout'];
	const layout = JSON.parse(layoutString);

	const saveLayout: any = {
		left: [],
		center: [],
		right: []
	};

	if (layout.left !== undefined) {
		saveLayout.left = layout.left;
	}
	if (layout.center !== undefined) {
		saveLayout.center = layout.center;
	}
	if (layout.right !== undefined) {
		saveLayout.right = layout.right;
	}

	UserSettings.findOne({
		userId: req.user
	}, (findErr: any, settings: IUserSettings) => {
		if (findErr !== null) {
			return res.sendStatus(500);
		}
		settings.homeLayout = saveLayout;
		settings.save((saveErr: any, savedSettings: IUserSettings) => {
			if (saveErr !== null) {
				return res.sendStatus(500);
			}
			req.session.save(() => {
				res.sendStatus(200);
			});
		});
	});
};
