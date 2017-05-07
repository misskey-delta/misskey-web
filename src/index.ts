const recluster: any = require('recluster');
const sticky: any = require('sticky-listen');
import * as path from 'path';
import {logInfo} from 'log-cool';
import config from './config';

(<any>Error).stackTraceLimit = Infinity;

console.log('Welcome to Misskey!\n');

const cluster = recluster(path.join(__dirname, 'server'), {
	readyWhen: 'ready'
});

cluster.run();

const balancer = sticky.createBalancer({
  behindProxy: true,
  activeWorkers: cluster.activeWorkers,
  maxRetries: 5,
  retryDelay: 100
});

const port = config.https.enable ? config.port.https : config.port.http;
balancer.listen(port, () => {
	logInfo(`\u001b[1;32mstart listening at ${port}\u001b[0m`);
});
