$ = require 'jquery'
urldecorator = require '../../../common/urldecorator.js'
imageviewer = require './image-viewer.js'

module.exports = (post-type, $content) ->
	switch (post-type)
	| \status, \reply =>
		# Init url preview
		$content.find '> .text a:not(.mention):not(.hashtag)' .each ->
			$link = urldecorator $ @
			if USER_SETTINGS.enable-url-preview-in-post
				$.ajax "https://github.com/prezzemolo/analizzatore" {
					type: \get
					data:
						'url': $link.attr \href
					+cache}
				.done (res) ->
					# debug
					console.dir res
					meta = JSON.parse res
					url = new URL meta.canonical
					html = """
					<a class="url-preview" title="#{url.href}" href="#{url.href}" target="_blank">
						<aside>
						#{
							if meta.image
							then "<div class=\"thumbnail\" style=\"background-image:url(https://images.weserv.nl/?url=#{meta.image}\">"
							else ''
						}
						</div>
						<h1 class="title">#{meta.title}</h1>
						#{
							if meta.description
							then "<p class=\"description\">#{meta.description}</p>"
							else ''
						}
						<footer>
							<p class="hostname">
								#{
									if url.protocol is 'https:'
									then "<i class=\"fa fa-lock secure\"></i>"
									else ''
								}
								#{url.hostname}
							</p>
							/*
							not implemented at ext service
							<img class="icon" src="https://images.weserv.nl/?url=#{meta.icon}" alt=""/>.
							*/
							#{
								if meta.site_name
								then "<p class=\"site-name\">#{meta.site_name}</p>"
								else ''
							}
						</footer>
						</aside>
					</a>
					"""
					# debug
					console.log html
					$ html .append-to $content .hide!.fade-in 200ms
		# Images
		$content.find '> .photos > .photo' .each ->
			$image = $ @
			imageviewer $image
