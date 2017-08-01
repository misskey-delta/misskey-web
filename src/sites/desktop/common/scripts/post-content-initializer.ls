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
				$.ajax "https://analizzatore.prezzemolo.ga/" {
					type: \get
					data:
						'url': $link.attr \href
					-global
					+cache
					xhrFields: {
						-with-credentials
					}
					# dirty hack
					headers: null
				}
				.done (meta) ->
					# debug
					console.dir meta
					urls = 
						canonical: new URL meta.canonical
						image: if meta.image then new URL meta.image else null
					html = """
					<a class="url-preview" title="#{urls.canonical.href}" href="#{urls.canonical.href}" target="_blank">
						<aside>
						#{
							if meta.image
							then "
								<div class=\"thumbnail\" style=\"background-image:url(
										https://images.weserv.nl/?url=#{urls.image.href.substr urls.image.protocol.length + 2}
								)\">
								</div>"
							else ''
						}
						<h1 class="title">#{meta.title}</h1>
						#{
							if meta.description
							then "<p class=\"description\">#{meta.description}</p>"
							else ''
						}
						<footer>
							<p class="hostname">
								#{
									if urls.canonical.protocol is 'https:'
									then "<i class=\"fa fa-lock secure\"></i>"
									else ''
								}
								#{urls.canonical.hostname}
							</p>
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
