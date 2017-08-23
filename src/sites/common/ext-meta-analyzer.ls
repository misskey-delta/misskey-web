/*
  for use external analyzer in misskey.
  service: https://github.com/prezzemolo/analizzatore
*/
$ = require 'jquery'

desc-cutter = (desc, length) ->
	if desc.length > length
	then "#{desc.substr 0 length}..."
	else desc

weserv-url-gen = (url) ->
	url-obj = new URL url
	\https://images.weserv.nl/?url= + encodeURIComponent url-obj.href.substr url-obj.protocol.length + 2

create-element = (name, attributes, text) ->
	elem = document.createElement name
	Object.entries attributes .forEach (attribute) !->
		elem.setAttribute attiribute[0], attribute[1]
	elem.innerText = text if text
	return elem

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

		a = create-element 'a',
			class: 'url-preview'
			target: '_blank'
		aside = create-element 'aside'
		a.appendChild aside

		# image
		if meta.image
		then
			image = create-element 'div',
				class: 'thumbnail'
				style: "background-image:url(#{weserv-url-gen meta.image})"
			aside.appendChild image
		# title
		title = create-element 'h1' null, meta.title
		aside.appendChild title
		# footer
		footer = create-element 'footer'
		aside.appendChild footer
		# hostname
		hostname = create-element 'p', class: 'hostname', canonical-url-object.hostname
		if canonical-url-object.protocol is 'https:'
		then
			i-secure = create-element 'i', class: 'fa fa-lock secure'
			hostname.appendChild i-secure
		aside.appendChild hostname
		# icon
		if meta.icon
		then
			icon = create-element 'img',
				class: 'icon'
				src: weserv-url-gen meta.icon
			aside.appendChild icon
		# site_name
		if meta.site_name
		then
			site-name = create-element 'p', class: 'site-name', meta.site_name
			aside.appendChild site-name

		res(a)
	.fail (...args) !-> rej(...args)
