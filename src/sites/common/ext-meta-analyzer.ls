/*
  for use external analyzer in misskey.
  service: https://github.com/prezzemolo/analizzatore
*/
$ = require 'jquery'

desc-cutter = (desc, length) ->
	if desc.length > length
	then "#{desc.substr(length)}..."
	else desc

weserv-url-gen = (url) ->
	url-obj = new URL url
	\https://images.weserv.nl/?url= + url-obj.href.substr url-obj.protocol.length + 2

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
		canonical-url-object = new URL meta.canonical
		html = """
		<a class="url-preview" title="#{canonical-url-object.href}" href="#{canonical-url-object.href}" target="_blank">
			<aside>
			#{
				if meta.image
				then "
					<div class=\"thumbnail\" style=\"background-image:url(
						#{weserv-url-gen meta.image}
					)\">
					</div>"
				else ''
			}
			<h1 class="title">#{meta.title}</h1>
			#{
				if meta.description
				then "<p class=\"description\">#{desc-cutter meta.description}</p>"
				else ''
			}
			<footer>
				<p class="hostname">
					#{
						if canonical-url-object.protocol is 'https:'
						then "<i class=\"fa fa-lock secure\"></i>"
						else ''
					}
					#{canonical-url-object.hostname}
				</p>
				#{
					if meta.favicon
					then "<img class=\"icon\" src=\"
						#{weserv-url-gen meta.favicon}
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
