import { task, src, dest } from 'gulp';
import * as glob from 'glob';
import * as ts from 'gulp-typescript';
import * as tslint from 'gulp-tslint';
import * as browserify from 'browserify';
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const es = require('event-stream');
const less = require('gulp-less');
const lessVars = require('gulp-less-json-variables');
const cssnano = require('gulp-cssnano');
const ls = require('gulp-livescript');
const uglify = require('gulp-uglify');

import config from './src/config';

const tsProject = ts.createProject('tsconfig.json', <any>{
	typescript: require('typescript'),
	target: 'ES5'
});

task('build', [
	'build:ts',
	'copy:bower_components',
	'copy:client-templates',
	'build:client-scripts',
	'build:client-styles',
	'build-copy'
]);

task('build-develop', [
	'build:ts',
	'copy:bower_components',
	'copy:client-templates',
	'build-develop:client-scripts',
	'build-develop:client-styles',
	'build-develop-copy'
]);

task('build:ts', () => {
	return tsProject.src()
		.pipe(ts(tsProject))
		.pipe(dest('./built'));
});

task('copy:bower_components', () => {
	return src('./bower_components/**/*')
		.pipe(dest('./built/resources/bower_components'));
});

task('compile:client-scripts', ['build:ts'], () => {
	return es.merge(
		src('./src/sites/**/*.ls')
			.pipe(ls()),
		src('./built/sites/common/scripts/*.js')
			.pipe(dest('./tmp/common/scripts/')),
		src('./src/sites/common/scripts/*.js')
			.pipe(dest('./tmp/common/scripts/')),
		src([
			'./src/sites/*/common/**/*.js',
			'./src/sites/*/pages/**/*.js',
			'!./src/sites/*/pages/**/controller.js'])
	).pipe(dest('./tmp/'));
});

task('copy:client-templates', () => {
	return es.merge(
		src('./src/sites/**/common/views/**/*.jade')
			.pipe(dest('./tmp/')),
		src('./src/sites/**/pages/**/*.jade')
			.pipe(dest('./tmp/')),
		src('./src/sites/**/common/widgets/**/*.jade')
			.pipe(dest('./tmp/')),
		src('./src/sites/common/**/*.jade')
			.pipe(dest('./tmp/common'))
	);
});

task('build:client-scripts', ['copy:client-templates', 'compile:client-scripts'], done => {
	glob('./tmp/**/*.js', (err: Error, files: string[]) => {
		const tasks = files.map((entry: string) => {
			return browserify({ entries: [entry] })
				.bundle()
				.pipe(source(entry.replace('tmp', 'resources')))
				.pipe(buffer())
				.pipe(uglify())
				.pipe(dest('./built'));
		});
		src('./tmp/common/scripts/*.js')
			.pipe(dest('./built/sites/common/scripts/'));
		es.merge(tasks).on('end', done);
	});
});

task('build-develop:client-scripts', ['copy:client-templates', 'compile:client-scripts'], done => {
	glob('./tmp/**/*.js', (err: Error, files: string[]) => {
		const tasks = files.map((entry: string) => {
			return browserify({ entries: [entry] })
				.bundle()
				.pipe(source(entry.replace('tmp', 'resources')))
				.pipe(dest('./built'));
		});
		src('./tmp/common/scripts/*.js')
			.pipe(dest('./built/sites/common/scripts/'));
		es.merge(tasks).on('end', done);
	});
});

task('set-less-variables', () => {
	return src('./src/sites/common/common.less')
		.pipe(lessVars({
			'@theme-color': config.publicConfig.themeColor,
			'@resources-url': "\"" + config.publicConfig.resourcesUrl + "\""
		}))
		.pipe(dest('./src/sites/common'));
});

task('build:client-styles', ['set-less-variables', 'copy:bower_components'], () => {
	return src('./src/sites/**/*.less')
		.pipe(less())
		.pipe(cssnano({
			safe: true // 高度な圧縮は無効にする (一部デザインが不適切になる場合があるため)
		}))
		.pipe(dest('./built/resources'));
});

task('build-develop:client-styles', ['set-less-variables', 'copy:bower_components'], () => {
	return src('./src/sites/**/*.less')
		.pipe(less())
		.pipe(dest('./built/resources'));
});

task('lint', () => {
	return src('./src/**/*.ts')
		.pipe(tslint(<any>{
			formatter: "verbose"
		}))
		.pipe(tslint.report())
});

task('build-copy', ['build:client-scripts'], () => {
	src(['./src/sites/*/common/**/*', './src/sites/*/pages/**/*'])
		.pipe(dest('./built/resources'));
	src([
		'./src/**/*',
		'!./src/**/*.ts',
		'!./src/**/*.ls',
		'!./src/**/*.js'
	]).pipe(dest('./built'));
	src([
		'./src/share/script.js'
	]).pipe(dest('./built/share'));
	src('./resources/**/*').pipe(dest('./built/resources/common/'));
});

task('build-develop-copy', ['build-develop:client-scripts'], () => {
	src(['./src/sites/*/common/**/*', './src/sites/*/pages/**/*'])
		.pipe(dest('./built/resources'));
	src([
		'./src/**/*',
		'!./src/**/*.ts',
		'!./src/**/*.ls',
		'!./src/**/*.js'
	]).pipe(dest('./built'));
	src([
		'./src/share/script.js'
	]).pipe(dest('./built/share'));
	src('./resources/**/*').pipe(dest('./built/resources/common/'));
});

task('test', ['lint', 'build:ts']);
