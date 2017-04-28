/**
 * analyze DB model.
 * クロールした時のデータブッコミ用です
 */

import * as mongoose from 'mongoose';
import db from '../db'

const scheme = new mongoose.Schema({
	url: String,
	html: String
});

export default db.model('analyzestore', scheme);
