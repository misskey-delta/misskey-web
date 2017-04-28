$ = require 'jquery'
require '../../common/scripts/main.js'

$ ->
	$ '#login-form' .submit (event) ->
		event.prevent-default!
		$form = $ @

		$.post CONFIG.signin-url, {
			'screen-name': $form.find '[name="screen-name"]' .val!
			'password': $form.find '[name="password"]' .val!
		}

		.done ->
			location.reload!
