'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var roundTo = require('round-to');

function MotorsSummary(quad) {
	var state = hg.state({
		speed: hg.value([]),
		force: hg.value([])
	});

	quad.on('motors-speed', function (speed) {
		state.speed.set(speed);
	});

	quad.on('motors-forces', function (force) {
		state.force.set(force);
	});

	return state;
}

MotorsSummary.render = function (state) {
	return h('.row', [
		h('.col-sm-6', [
			h('p', [
				'Motors speed (x10µs):'
			].concat(renderMotors(state.speed)))
		]),
		h('.col-sm-6', [
			h('p', [
				'Motors force (N):'
			].concat(renderMotors(state.force)))
		]),
	]);
};

function renderMotors(values) {
	// TODO: use quad.config.servos.pins[i] to index motors
	return values.map(function (val, i) {
		return [h('br'), i + ': ' + roundTo(val, 2)];
	});
}

module.exports = MotorsSummary;
