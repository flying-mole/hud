function HardwareJoystick(oninput) {
	if (!HardwareJoystick.isSupported()) {
		throw new Error('Gamepad API not supported');
	}

	var that = this;

	window.addEventListener('gamepadconnected', function (e) {
		console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
			e.gamepad.index, e.gamepad.id,
			e.gamepad.buttons.length, e.gamepad.axes.length);
		log('Gamepad "'+e.gamepad.id+'" connected.');

		that.gamepad = navigator.getGamepads()[e.gamepad.index];
		that._loop(oninput);
	});

	window.addEventListener('gamepaddisconnected', function (e) {
		log('Gamepad "'+e.gamepad.id+'" disconnected.');
	});
}

HardwareJoystick.isSupported = function () {
	return (!!navigator.getGamepads || !!navigator.webkitGetGamepads);
};

HardwareJoystick.prototype._loop = function (oninput) {
	console.log(this.gamepad);

	var gamepad = this.gamepad;

	setInterval(function () { // TODO
		oninput({
			alpha: gamepad.axes[1],
			beta: gamepad.axes[0], // front-to-back tilt in degrees, where front is positive
			gamma: gamepad.axes[2] // left-to-right tilt in degrees, where right is positive
		});
		// gamepad.axes[3] is POWER
	}, 500);
};

module.exports = HardwareJoystick;
