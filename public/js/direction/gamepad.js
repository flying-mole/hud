'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var window = require('global/window');
var extend = require('extend');

function GamepadDirection() {
	var state = hg.state({
		enabled: hg.value(false),
		x: hg.value(0),
		y: hg.value(0),
		z: hg.value(0),
		power: hg.value(0)
	});

	//state.enabled.set(!!navigator.getGamepads || !!navigator.webkitGetGamepads);

	window.addEventListener('gamepadconnected', function (event) {
		console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
			event.gamepad.index, event.gamepad.id,
			event.gamepad.buttons.length, event.gamepad.axes.length);

		state.enabled.set(true);

		connected(state, event.gamepad);
	});

	window.addEventListener('gamepaddisconnected', function (event) {
		state.enabled.set(false);
	});

	return state;
}

function connected(state, gamepad) {
	var calibration = extend([], this.gamepad.axes);

	var interval = setInterval(function () {
		if (!that.gamepad.connected) {
			return clearInterval(interval);
		}

		var axes = that.gamepad.axes.map(function (value, i) {
			if (calibration && calibration[i]) {
				return value - calibration[i];
			}
			return value;
		});

		state.x.set('x', axes[0]);
		state.y.set('y', axes[1]);
		state.z.set('z', axes[2]);

		state.power.set(-axes[3]);
	}, 200);
}

GamepadDirection.render = function (state) {
	return h('.text-center', (state.enabled) ? 'Gamepad connected' : 'Connect a gamepad');
};

module.exports = GamepadDirection;
