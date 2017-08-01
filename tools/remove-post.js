'use strict'

// load misskey config
const config = require('../built/config').default
if (!config) {
    console.error("failed to load configration.")
    process.exit(1)
}

const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const connection = mongoose.createConnection(config.mongo.uri, {
    promiseLibrary: global.Promise
})
const postScheme = new mongoose.Schema({
    _id: String,
    // JSON
    session: String,
    expires: Date
})
const Sessions = connection.model('sessions', sessionsScheme)
Sessions.find({}).where('session').exists().exec().then((values) => {
    values.forEach(value => {
        const obj = value.toObject()
        const session = JSON.parse(obj.session)
        // if not logged in session, return
        if (!session.userId) return;
        // get date from session data
        const date = new Date()
        date.setTime(session.time)
        // join proxy & ip
        const sessionIP = session.proxy ? session.proxy + ", " + session.ip : session.ip
        // show detail
        console.log(
            `[${time(date)}] "${session.user}" (${session.userId}) signin with "${session['user-agent']}" from "${sessionIP}"`
        )
    })
    process.exit(0)
}).catch(e => {
    console.log(e.stack)
    process.exit(1)
})
