function MouseJoystick(el, cmd) {
	var that = this;

	this.joystick = $(el);
	this.handle = this.joystick.find('.handle');

	var joystickSize = {
		width: this.joystick.width(),
		height: this.joystick.height()
	};
	var handleSize = {
		width: this.handle.width(),
		height: this.handle.height()
	};

	this.pressed = true;

	var offset;
	this.joystick.on('mousedown mousemove mouseup', function (event) {
		if ((event.type == 'mousemove' && event.buttons) || event.type == 'mousedown') {
			if (!that.pressed) {
				that.joystick.addClass('active');
				that.pressed = true;

				offset = that.joystick.offset();
			}

			var x = event.pageX - offset.left - handleSize.width/2,
				y = event.pageY - offset.top - handleSize.height/2;

			// In degrees
			cmd.send('orientation', {
				x: (x - joystickSize.width/2) / joystickSize.width * 90, // front-to-back tilt in degrees, where front is positive
				y: (y - joystickSize.height/2) / joystickSize.height * 90, // left-to-right tilt in degrees, where right is positive
				z: 0
			});
		} else {
			if (that.pressed) {
				that.joystick.removeClass('active');
				that.handle.css({
					left: joystickSize.width/2 - handleSize.width/2,
					top: joystickSize.height/2 - handleSize.height/2
				});
				that.pressed = false;

				cmd.send('orientation', {
					x: 0,
					y: 0,
					z: 0
				});
			}
		}
	});
	this.joystick.trigger('mouseup');

	cmd.on('orientation', function (data) {
		that.handle.css({
			left: joystickSize.width/2 - handleSize.width/2 + data.x/90*joystickSize.width,
			top: joystickSize.height/2 - handleSize.height/2 + data.y/90*joystickSize.height
		});
	});
}

MouseJoystick.isSupported = function () {
	return true;
};

module.exports = MouseJoystick;
