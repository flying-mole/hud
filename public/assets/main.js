$(function () {
	var $dir = $('#direction-input'),
		$dirHandle = $dir.find('.handle');

	var joystickSize = {
		width: $dir.width(),
		height: $dir.height()
	};
	var handleSize = {
		width: $dirHandle.width(),
		height: $dirHandle.height()
	};

	var pressed = true;
	$dir.on('mousedown mousemove mouseup', function (event) {
		if ((event.type == 'mousemove' && event.buttons) || event.type == 'mousedown') {
			if (!pressed) {
				$dir.addClass('active');
				// $dirHandle.css({
				// 	width: handleSize.width,
				// 	height: handleSize.height
				// });
				pressed = true;
			}

			var offset = $dir.offset();
			$dirHandle.css({
				left: event.clientX - offset.left - handleSize.width/2,
				top: event.clientY - offset.top - handleSize.height/2
			});
		} else {
			if (pressed) {
				$dir.removeClass('active');
				/*$dirHandle.css({
					left: 0,
					top: 0,
					width: joystickSize.width,
					height: joystickSize.height
				});*/
				$dirHandle.css({
					left: joystickSize.width/2 - handleSize.width/2,
					top: joystickSize.height/2 - handleSize.height/2
				});
				pressed = false;
			}
		}
	});
	$dir.trigger('mouseup');
});