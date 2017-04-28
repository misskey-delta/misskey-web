/**
 * analyze DB model.
 * クロールした時のデータブッコミ用です
 */

import * as mongoose from 'mongoose';
import config from '../config';

const db: mongoose.Connection = mongoose.createConnection(config.mongo.uri, config.mongo.options);

const scheme = new mongoose.Schema({
	url: String,
	html: String
});

export default db.model('analyzestore', scheme);
