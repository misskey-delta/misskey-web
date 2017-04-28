import * as gulp from 'gulp';
import * as glob from 'glob';
import * as ts from 'gulp-typescript';
import * as tslint from 'gulp-tslint';
import * as browserify from 'browserify';
import * as Vinyl from 'vinyl';
const source = require('vinyl-source-stream');
const es = require('event-stream');
const less = require('gulp-less');
const lessVars = require('gulp-less-json-variables');
const ls = require('gulp-livescript');

const tsProject = ts.createProject('tsconfig.json', {
	typescript: require('typescript'),
	target: 'ES5'
});

gulp.task('build', [
	'build:ts',
	'copy:client-templates',
	'build:client-scripts',
	'build:client-styles',
	'build-copy'
]);

gulp.task('build:ts', () => {
	return tsProject.src()
		.pipe(tsProject())
		.pipe(gulp.dest('./built'));
});

gulp.task('compile:client-scripts', ['build:ts'], () => {
	return es.merge(
		gulp.src('./src/sites/**/*.ls')
			.pipe(ls()),
		gulp.src('./built/sites/common/scripts/*.js')
			.pipe(gulp.dest('./tmp/common/scripts/')),
		gulp.src('./src/sites/common/scripts/*.js')
			.pipe(gulp.dest('./tmp/common/scripts/')),
		gulp.src([
			'./src/sites/*/common/**/*.js',
			'./src/sites/*/pages/**/*.js',
			'!./src/sites/*/pages/**/controller.js'])
	).pipe(gulp.dest('./tmp/'));
});

gulp.task('copy:client-templates', () => {
	return es.merge(
		gulp.src('./src/sites/**/common/views/**/*.jade')
			.pipe(gulp.dest('./tmp/')),
		gulp.src('./src/sites/**/pages/**/*.jade')
			.pipe(gulp.dest('./tmp/')),
		gulp.src('./src/sites/**/common/widgets/**/*.jade')
			.pipe(gulp.dest('./tmp/')),
		gulp.src('./src/sites/common/**/*.jade')
			.pipe(gulp.dest('./tmp/common'))
	);
});

gulp.task('build:client-scripts', ['copy:client-templates', 'compile:client-scripts'], done => {
	glob('./tmp/**/*.js', (err: Error, files: string[]) => {
		const tasks = files.map((entry: string) => {
			return browserify({ entries: [entry] })
				.bundle()
				.pipe(source(entry.replace('tmp', 'resources')))
				.pipe(gulp.dest('./built'));
		});
		gulp.src('./tmp/common/scripts/*.js')
			.pipe(gulp.dest('./built/sites/common/scripts/'));
		es.merge(tasks).on('end', done);
	});
});

gulp.task('create:common-less', () => {
	const theme = {
		'@theme-color': config.publicConfig.themeColor,
		'@resources-url': `"${config.publicConfig.resourcesUrl}"`
	};
	const vinyl = new Vinyl({
		path: 'common.less',
		contents: new Buffer('\n')
	});
	return es.readArray([vinyl]).pipe(lessVars(theme)).pipe(gulp.dest('./src/sites/common/'));
});

gulp.task('build:client-styles', ['create:common-less'],  () => {
	return gulp.src('./src/sites/**/*.less')
		.pipe(less())
		.pipe(gulp.dest('./built/resources'));
});

gulp.task('lint', () => {
	return gulp.src(['./src/**/*.ts', './expansion-types/*.d.ts'])
		.pipe(tslint({
			formatter: "verbose"
		}))
		.pipe(tslint.report())
});

gulp.task('build-copy', ['build:client-scripts'], () => {
	gulp.src(['./src/sites/*/common/**/*', './src/sites/*/pages/**/*'])
		.pipe(gulp.dest('./built/resources'));
	gulp.src([
		'./src/**/*',
		'!./src/**/*.ts',
		'!./src/**/*.ls',
		'!./src/**/*.js'
	]).pipe(gulp.dest('./built'));
	gulp.src([
		'./src/share/script.js'
	]).pipe(gulp.dest('./built/share'));
	gulp.src('./resources/**/*').pipe(gulp.dest('./built/resources/common/'));
});

gulp.task('build-develop-copy', ['build-develop:client-scripts'], () => {
	gulp.src(['./src/sites/*/common/**/*', './src/sites/*/pages/**/*'])
		.pipe(gulp.dest('./built/resources'));
	gulp.src([
		'./src/**/*',
		'!./src/**/*.ts',
		'!./src/**/*.ls',
		'!./src/**/*.js'
	]).pipe(gulp.dest('./built'));
	gulp.src([
		'./src/share/script.js'
	]).pipe(gulp.dest('./built/share'));
	gulp.src('./resources/**/*').pipe(gulp.dest('./built/resources/common/'));
});

gulp.task('test', ['lint', 'build:ts']);
