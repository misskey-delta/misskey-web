import * as mongoose from 'mongoose';
import config from '../../config';

// use native promise
(<any>mongoose).Promise = global.Promise
const options = Object.assign(
    {
        promiseLibrary: global.Promise
    },
    config.mongo.options
)

const db: mongoose.Connection = mongoose.createConnection(config.mongo.uri, options);

export default db
