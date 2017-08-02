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
	\https://images.weserv.nl/?url= + encodeURIComponent url-obj.href.substr url-obj.protocol.length + 2

weserv-gen-icon-after-precheck = (url) -> new Promise (res, rej) !->
	weserv-url = weserv-url-gen url
	fetch weserv-url, {
		mode: \no-cors
		method: \HEAD
	}
	.then (Response) !->
		if Response.ok
		then res gen-icon weserv-url
		else res ''
	.catch (...args) -> rej ...args

gen-icon = (icon) ->
	"</p><img class=\"icon\" src=\"#{icon}\" alt=\"\"/>"

module.exports = (url) -> new Promise (res, rej) !->
	$.ajax "https://analizzatore.prezzemolo.ga/" {
		type: \get
		data:
			url: url
			lang: LANG
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
		"""
		weserv-gen-icon-after-precheck if meta.icon then meta.icon else canonical-url-object.origin + '/favicon.ico'
		.then (icon) !->
			html += icon
			html +=	"
					#{
						if meta.site_name
						then "<p class=\"site-name\">#{meta.site_name}</p>"
						else ''
					}
				</footer>
				</aside>
			</a>
			"
			res(html)
		.catch (...args) !-> rej ...args
	.fail (...args) !-> rej ...args
