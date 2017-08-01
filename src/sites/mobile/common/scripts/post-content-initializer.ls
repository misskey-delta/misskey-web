$ = require 'jquery'
urldecorator = require '../../../common/urldecorator.js'
metaanalyzer = require '../../../common/ext-meta-analyzer.js'

module.exports = (post-type, $content) ->
	switch (post-type)
	| \status, \photo =>
		# Init url preview
		$content.find '> .text a:not(.mention):not(.hashtag)' .each ->
			$link = urldecorator $ @
			if USER_SETTINGS.enable-url-preview-in-post
				metaanalyzer $link.attr \href
				.then (html) ->
					# debug
					console.log html
					$ html .append-to $content .hide!.fade-in 200ms
