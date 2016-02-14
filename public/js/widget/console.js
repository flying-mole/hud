'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function Console(quad) {
	var state = hg.state({
		messages: hg.array([])
	});

	function log(item) {
		return Console.log(state, item);
	}

	quad.on('error', function (msg) {
		log({ type: 'error', msg: msg });
	});
	quad.on('info', function (msg) {
		log({ type: 'info', msg: msg });
	});

	quad.on('features', function (features) {
		var allGreen = true;

		if (features.hardware.indexOf('motors') === -1) {
			log({ type: 'error', msg: 'Motors not available' });
			allGreen = false;
		}
		if (features.hardware.indexOf('imu') === -1) {
			log({ type: 'error', msg: 'Inertial Measurement Unit not available' });
			allGreen = false;
		}

		log('Available features: ' + (features.hardware.join(', ') || '(none)'));

		if (allGreen) {
			log({ type: 'success', msg: 'ALL GREEN!' });
		}
	});

	quad.on('motors-speed', function (speeds) {
		if (!quad.config) {
			return;
		}

		var range = quad.config.servos.range;
		for (var i = 0; i < speeds.length; i++) {
			var speed = speeds[i];
			if (speed >= range[1]) {
				// Max. motor power reached
				log({ type: 'error', msg: 'Motor '+quad.config.servos.pins[i]+' is at full power!' });
			}
		}
	});

	quad.client.on('connecting', function () {
		log('Connecting to server...');
	});

	quad.client.on('connected', function () {
		log('Connected!');
	});

	quad.client.on('disconnect', function () {
		log('Disconnected from server.');
	});

	quad.client.on('error', function (err) {
		log({ type: 'error', msg: err });
	});

	return state;
}

Console.log = function (state, item) {
	if (typeof item === 'string') {
		item = { msg: item };
	}

	state.messages.push(item);
};

Console.render = function (state) {
	return h('#console.container-fluid', [
		h('pre', state.messages.map(function (item) {
			return h('span.' + (item.type || 'log'), item.msg + '\n');
		}))
	]);
};

module.exports = Console;
