'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var window = require('global/window');
var Switch = require('../component/switch');

function DeviceOrientationDirection() {
	var state = hg.state({
		switch: Switch('device-orientation-switch'),
		x: hg.value(0),
		y: hg.value(0),
		z: hg.value(0)
	});

	state.switch.disabled.set(typeof window.DeviceOrientationEvent === 'undefined');

	window.addEventListener('deviceorientation', function (event) {
		if (!state.switch.value()) return;

		state.x.set(event.beta / 180); // front-to-back tilt in degrees, where front is positive
		state.y.set(event.gamma / 180); // left-to-right tilt in degrees, where right is positive
		state.z.set(event.alpha / 180);
	});

	return state;
}

DeviceOrientationDirection.render = function (state) {
	return h('.text-center', [
		Switch.render(state.switch),
		h('label', {
			htmlFor: state.switch.id
		}, 'Use sensors to control orientation')
	]);
};

module.exports = DeviceOrientationDirection;
