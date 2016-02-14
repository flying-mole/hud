'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var roundTo = require('round-to');

function OrientationSummary(quad) {
	var state = hg.state({
		gyro: hg.value({}),
		accel: hg.value({}),
		rotation: hg.value({}),
		temp: hg.value(0)
	});

	quad.on('orientation', function (data) {
		state.gyro.set(data.gyro);
		state.accel.set(data.accel);
		state.rotation.set(data.rotation);
		state.temp.set(data.temp);
	});

	return state;
}

OrientationSummary.render = function (state) {
	return h('p', [
		'Gyro (°/s): ' + renderValues(state.gyro), h('br'),
		'Accel (g): ' + renderValues(state.accel), h('br'),
		'Rotation (°): ' + renderValues(state.rotation), h('br'),
		'Temperature (°C): ' + Math.round(state.temp)
	]);
};

function renderValues(values) {
	return Object.keys(values).map(function (name) {
		return roundTo(values[name], 2);
	}).join(', ');
}

module.exports = OrientationSummary;
