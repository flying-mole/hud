var $ = require('jquery');

function GamepadInput(cmd) {
	if (!GamepadInput.isSupported()) {
		throw new Error('Gamepad API not supported');
	}

	var that = this;

	window.addEventListener('gamepadconnected', function (e) {
		console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
			e.gamepad.index, e.gamepad.id,
			e.gamepad.buttons.length, e.gamepad.axes.length);
		log('Gamepad "'+e.gamepad.id+'" connected.');

		that.gamepad = navigator.getGamepads()[e.gamepad.index];
		that.calibrate();
		that._loop(cmd);
	});

	window.addEventListener('gamepaddisconnected', function (e) {
		log('Gamepad "'+e.gamepad.id+'" disconnected.');
	});
}

GamepadInput.isSupported = function () {
	return (!!navigator.getGamepads || !!navigator.webkitGetGamepads);
};

GamepadInput.prototype._loop = function (cmd) {
	console.log(this.gamepad);

	var that = this;

	var interval = setInterval(function () { // TODO
		if (!that.gamepad.connected) {
			clearInterval(interval);
			return;
		}

		var cal = that.calibration;
		var axes = that.gamepad.axes.map(function (value, i) {
			if (cal && cal[i]) {
				return value - cal[i];
			}
			return value;
		});

		cmd.send('orientation', {
			x: axes[0] * 90,
			y: axes[1] * 90,
			z: axes[2] * 90
		});
		cmd.send('power', - axes[3]);
	}, 500);
};

GamepadInput.prototype.calibrate = function () {
	this.calibration = $.extend([], this.gamepad.axes);
};

module.exports = GamepadInput;
