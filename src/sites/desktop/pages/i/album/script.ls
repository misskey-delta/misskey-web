require '../../../common/scripts/ui.js'
Album = require '../../../common/scripts/album-core.js'
$ = require 'jquery'

$ ->
	album = new Album $ '#album > .misskey-album'
