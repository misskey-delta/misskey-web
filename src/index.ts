const recluster: any = require('recluster');
const sticky: any = require('sticky-listen');
import * as path from 'path';
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

balancer.listen(config.https.enable ? config.port.https : config.port.http);
