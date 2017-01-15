'use strict';

const ts = require('typescript');
const fs = require('fs');
const code = ts.transpile(fs.readFileSync('./gulpfile.ts').toString());
const config = ts.transpile(fs.readFileSync('./src/config.ts').toString());
eval(code);