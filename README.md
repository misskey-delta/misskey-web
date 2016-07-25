# Misskey Web
[![][travis-badge]][travis-link]
[![][gemnasium-badge]][gemnasium-link]
[![][david-dev-badge]][david-dev-link]
[![][mit-badge]][mit]

## External dependencies
* Node.js
* npm
* MongoDB
* Redis
* GraphicsMagick (for trimming, compress, etc etc)

## How to build
1. `git clone git://github.com/MissKernel/Misskey-Web.git`
2. `cd Misskey-Web`
3. `npm install`
4. `npm run dtsm`
4. `./node_modules/.bin/bower install`
5. `npm run build`

## How to start Misskey Web server
`npm start`

## How to display options
`npm start -- -h`

## People

The original author of Misskey is [syuilo](https://github.com/syuilo)

The current lead maintainer is [otofune](https://github.com/otofune)

[List of all contributors](https://github.com/sagume/Misskey-Web/graphs/contributors)

## License
The MIT License. See [LICENSE](LICENSE).

[mit]:             http://opensource.org/licenses/MIT
[mit-badge]:       https://img.shields.io/badge/license-MIT-444444.svg?style=flat-square
[travis-link]:     https://travis-ci.org/sagume/Misskey-Web
[travis-badge]:    http://img.shields.io/travis/sagume/Misskey-Web.svg?style=flat-square
[david-dev-link]:  https://david-dm.org/sagume/Misskey-Web#info=devDependencies&view=table
[david-dev-badge]: https://img.shields.io/david/dev/sagume/Misskey-Web.svg?style=flat-square
[gemnasium-link]:  https://gemnasium.com/sagume/Misskey-Web
[gemnasium-badge]: https://gemnasium.com/sagume/Misskey-Web.svg