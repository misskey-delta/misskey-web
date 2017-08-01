/*
  for use external analyzer in misskey.
  service: https://github.com/prezzemolo/analizzatore
*/
$ = require 'jquery'

module.exports = (url) -> new Promise (res, rej) !->
	$.ajax "https://analizzatore.prezzemolo.ga/" {
		type: \get
		data:
			'url': url
		-global
		+cache
		xhrFields: {
			-with-credentials
		}
		# dirty hack
		headers: null
	}
	.done (meta) ->
		urls = 
			canonical: new URL meta.canonical
			image: if meta.image then new URL meta.image else null
			favicon: if meta.favicon then new URL meta.favicon else null
		html = """
		<a class="url-preview" title="#{urls.canonical.href}" href="#{urls.canonical.href}" target="_blank">
			<aside>
			#{
				if meta.image
				then "
					<div class=\"thumbnail\" style=\"background-image:url(
						https://images.weserv.nl/?url=
						#{urls.image.href.substr urls.image.protocol.length + 2}
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
					if meta.favicon
					then "<img class=\"icon\" src=\"
						https://images.weserv.nl/?url=
						#{urls.favicon.href.substr urls.favicon.protocol.length + 2}
						\" alt=\"\"/>"
					else ''
				}
				#{
					if meta.site_name
					then "<p class=\"site-name\">#{meta.site_name}</p>"
					else ''
				}
			</footer>
			</aside>
		</a>
		"""
		res(html)
	.fail (...args) !-> rej(...args)
