// import * as fs from 'fs';
import * as http from 'http';
import * as express from 'express';
// import * as vhost from 'vhost';
import config from './config';

const vhost: any = require('vhost');

console.log('Servers loader loaded');

// Init express
const app: express.Express = express();
app.disable('x-powered-by');

const server: http.Server = http.createServer(app);

// Define servers
const mainServer: express.Express = require(`${__dirname}/web/main`).server;
// const devServer: express.Express = require(`${__dirname}/web/dev`).server;
app.use(vhost('misskey.xyz', mainServer));
// app.use(vhost('dev.misskey.xyz', devServer));

// Listen core app
server.listen(config.port.http, () => {
	const host: string = server.address().address;
	const port: number = server.address().port;

	console.log(`>>> Misskey listening at ${host}:${port} <<<`);
});
