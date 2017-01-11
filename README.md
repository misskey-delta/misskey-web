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
#### step by step
1. `git clone git://github.com/misskey-delta/Misskey-Web.git`
2. `cd Misskey-Web`
3. `npm install`
4. `npm run bower`
5. `npm run build`

#### one shot
`npm run deploy`

## How to start Misskey Web server
`npm start`

## How to display options
`npm start -- -h`

## People

The original author of Misskey is [syuilo](https://github.com/syuilo)

The current lead maintainer is [otofune](https://github.com/otofune)

[List of all contributors](https://github.com/misskey-delta/Misskey-Web/graphs/contributors)

## License
The MIT License. See [LICENSE](LICENSE).

[mit]:             http://opensource.org/licenses/MIT
[mit-badge]:       https://img.shields.io/badge/license-MIT-444444.svg?style=flat-square
[travis-link]:     https://travis-ci.org/misskey-delta/Misskey-Web
[travis-badge]:    https://img.shields.io/travis/misskey-delta/Misskey-Web/master.svg?style=flat-square
[gemnasium-link]:  https://gemnasium.com/misskey-delta/Misskey-Web
[gemnasium-badge]: https://img.shields.io/gemnasium/misskey-delta/Misskey-Web.svg?style=flat-square
[david-dev-link]:  https://david-dm.org/misskey-delta/Misskey-Web?type=dev
[david-dev-badge]: https://img.shields.io/david/dev/misskey-delta/Misskey-Web.svg?style=flat-square
