$ = require 'jquery/dist/jquery'

window.CSRF_TOKEN = $ 'meta[name="csrf-token"]' .attr \content

$.ajax-setup {
	type: \post
	-cache
	xhr-fields: {+with-credentials}
	headers: {
		'csrf-token': CSRF_TOKEN
	}
}
