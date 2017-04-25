'use strict'

const zeroPadding = (num, length, showPlusSign = false) => {
    if (!Number.isInteger(length) || !Number.isInteger(num)) {
        throw new Error('argument must be integer.')
    }
    const isNegative = num < 0
    const str = Math.abs(num).toString()
    const brevity = length - str.length
    if (brevity <= 0) return num.toString()
    return (isNegative ? '-' : showPlusSign ? '+' : '') + Array(brevity + 1).join('0') + str
}

const time = (date = new Date()) => {
    const offsetMinutes = -date.getTimezoneOffset()
    const offsetReminder = offsetMinutes % 60
    const offsetHours = (offsetMinutes - offsetReminder) / 60
    return zeroPadding(date.getFullYear(), 2) + '/' +
        zeroPadding(date.getMonth() + 1, 2) + '/' +
        zeroPadding(date.getDate(), 2) + ' ' +
        zeroPadding(date.getHours(), 2) + ':' +
        zeroPadding(date.getMinutes(), 2) + ':' +
        zeroPadding(date.getSeconds(), 2) + ' ' +
        zeroPadding(offsetHours, 2, true) +
        zeroPadding(Math.abs(offsetReminder), 2)
}

const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const connection = mongoose.createConnection('mongodb://localhost:27017/misskey-web', {
    promiseLibrary: global.Promise
})
const sessionsScheme = new mongoose.Schema({
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
