$ = require 'jquery'
require 'jquery.transit'
upload-file = require '../../../common/upload-file.js'
file-compiler = require '../views/album/file.pug'

class Album
	($album) ->
		self = @
		@on-file-dblclicked = null
		@current-location = null
		@$album = $album
		@$album-header = @$album.find '> header'
		@$album-uploads = @$album.find '> .uploads'
		@$album-uploader = @$album-header.find '> .uploader'
		@$album-chooser = @$album-header.find '> .chooser'
		@$album-close = @$album-header.find '> .close'
		@$album-browser = @$album.find '> .browser'
		@$album-browser-contextmenu = @$album-browser.find '> .menu'
		@$selection = @$album-browser.find '> .selection'
		@$album-files = @$album-browser.find '> .files'

		# Init uploader
		@$album-uploader.find \button .click ->
			self.$album-uploader.find \input .click!
			false
		@$album-uploader.find \input .change ->
			files = (self.$album-uploader.find \input)[0].files
			for i from 0 to files.length - 1
				file = files.item i
				self.upload file

		# Init context menu
		@init-contextmenu self.$album-browser, self.$album-browser-contextmenu

		# Init selectd area highlighter
		@$album-browser.mousedown (e) ->
			left = e.page-x + self.$album-browser.scroll-left! - self.$album-browser.offset!.left
			top = e.page-y + self.$album-browser.scroll-top! - self.$album-browser.offset!.top
			self.$selection.stop!
			self.$selection.css {
				display: \block
				top: top
				left: left
				width: 0
				height: 0
				opacity: 1
			}
			self.$album-files.find \.file .each ->
				($ @).attr \data-selected \false
			function move(e)
				cursor-x = e.page-x + self.$album-browser.scroll-left! - self.$album-browser.offset!.left
				cursor-y = e.page-y + self.$album-browser.scroll-top! - self.$album-browser.offset!.top
				w = cursor-x - left
				h = cursor-y - top
				css = {
					opacity: 1
				}
				if w > 0
					css.width = w
					css.left = left
				else
					css.width = -w
					css.left = cursor-x
				if h > 0
					css.height = h
					css.top = top
				else
					css.height = -h
					css.top = cursor-y

				self.$selection.css css

				# 重なり判定
				selection-top = self.$selection.offset!.top
				selection-left = self.$selection.offset!.left
				selection-width = self.$selection.outer-width!
				selection-height = self.$selection.outer-height!
				self.$album-files.find \.file .each ->
					$item = $ @
					item-top = $item.offset!.top
					item-left = $item.offset!.left
					item-width = $item.outer-width!
					item-height = $item.outer-height!
					if ((item-left + item-width) > selection-left) && (item-left < (selection-left + selection-width)) && ((item-top + item-height) > selection-top) && (item-top < (selection-top + selection-height))
						$item.attr \data-selected \true
					else
						$item.attr \data-selected \false
			function up(e)
				$ \html .off \mousemove move
				$ \html .off \mouseup up
				self.$selection.animate {
					opacity: 0
				} 100ms ->
					self.$selection.css {
						display: \none
					}
			$ \html .on \mousemove move
			$ \html .on \mouseup up

		self.load-files!

	get-selected-files: ->
		selected-files = []
		@$album-files.find '> .file[data-selected="true"]' .each ->
			selected-files.push JSON.parse ($ @).attr \data-data
		return selected-files

	insert-date-info: ($file, reverse = no) ->
		$compare-file =
			if reverse
			then $file.next \.file
			else $file.prev \.file
		if $compare-file.length == 0
			return
		compare-date = new Date $compare-file.attr \data-created-at
		current-date = new Date $file.attr \data-created-at
		if compare-date.get-date! != current-date.get-date!
			date-info-str = if reverse
				then "#{compare-date.get-full-year!} / #{compare-date.get-month! + 1} / #{compare-date.get-date!}"
				else "#{current-date.get-full-year!} / #{current-date.get-month! + 1} / #{current-date.get-date!}"
			$date-info = $ '<div class="date"><p>' + date-info-str + '</p></div>'
			if reverse
				$file.after $date-info
			else
				$file.before $date-info

	add-file: (file) ->
		self = @
		$file = $ file-compiler {
			file
			config: CONFIG
			locale: LOCALE
			me: ME
		}
		@$album-files.append $file
		@insert-date-info $file
		@init-contextmenu $file, ($file.find '> .context-menu'), ->
			$file.attr \data-selected \true
		$file.mousedown (e) ->
			e.stop-immediate-propagation!
		$file.click ->
			is-selected = ($file.attr \data-selected) == \true
			if is-selected
				$file.attr \data-selected \false
			else
				$file.attr \data-selected \true

		$file.dblclick ->
			$file.attr \data-selected \true
			if self.on-file-dblclicked?
				self.on-file-dblclicked $file

	load-files: ->
		self = @
		$.ajax "#{CONFIG.web-api-url}/album/files/stream"
		.done (files) ->
			self.$album-files.empty!
			files.for-each (file) ->
				self.add-file file
		.fail ->
			window.display-message '読み込みに失敗しました。再度お試しください。'

	upload: (file) ->
		self = @
		@$album-uploads.css \display \block
		$info = $ "<li><p class='name'>#{file.name}</p><progress></progress></li>"
		$progress-bar = $info.find \progress
		@$album-uploads.find \ol .append $info
		upload-file do
			file
			null
			$progress-bar
			null
			(file-obj) ->
				if self.current-location == file-obj.folder
					self.add-file file-obj
			(err) ->
				window.display-message 'アップロードに失敗しました。'

	init-contextmenu: ($trigger, $menu, shown) ->
		$instance = null

		$trigger.bind \contextmenu (e) ->
			e.stop-immediate-propagation!

			function mousedown(e)
				e.stop-immediate-propagation!
				if e.which == 3
					close!
				else if (!$.contains $instance[0], e.target) and (e.target != $instance[0])
					close!
				return false

			function close
				$instance.remove!
				$instance := null
				$ 'body *' .each ->
					($ @).off \mousedown mousedown

			function open
				$ 'body *' .each ->
					($ @).on \mousedown mousedown
				$instance := $menu.clone true
					..add-class \misskey-album-context-menu
					..bind \contextmenu (e) ->
						e.stop-immediate-propagation!
						return false
				$instance.append-to $ \body
					.css {
						top: e.page-y
						left: e.page-x
						opacity: 0
					}
					.animate {
						opacity: 1
					} 100ms
				if shown?
					shown!

			if $instance?
				close!
			else
				open!

			return false

module.exports = Album
