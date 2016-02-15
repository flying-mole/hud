'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function SineDirection() {
	return hg.state({
		x: hg.value(0),
		y: hg.value(0),
		z: hg.value(0),

		enabled: hg.value(false),
		axis: hg.value('x'),
		amplitude: hg.value(0),
		frequency: hg.value(0),
		offset: hg.value(0),

		channels: {
			start: start,
			stop: stop
		}
	});
}

function send(state, data) {
	state.x.set(parseFloat(data.x) || 0);
	state.y.set(parseFloat(data.y) || 0);
	state.z.set(parseFloat(data.z) || 0);
}

function start(state, data) {
	if (state.enabled()) {
		stop(state);
	}

	state.enabled.set(true);

	state.axis.set(data.axis);
	state.amplitude.set(parseFloat(data.amplitude) || 0);
	state.frequency.set(parseFloat(data.frequency) || 0);
	state.offset.set(parseFloat(data.offset) || 0);

	// Reset all axes
	state.x.set(0);
	state.y.set(0);
	state.z.set(0);

	var A = state.amplitude(),
		f = state.frequency(),
		phi = state.offset();

	var startedAt = Date.now();
	var interval = setInterval(function () {
		var t = (Date.now() - startedAt) / 1000;

		state[state.axis()].set(A * Math.sin(2 * Math.PI * f * t + phi));
	}, 200);

	var removeListener = state.enabled(function (val) {
		if (val) return;

		clearInterval(interval);
		removeListener();
	});
}

function stop(state) {
	state.enabled.set(false);
}

SineDirection.render = function (state) {
	return h('form.form-inline', { 'ev-submit': hg.sendSubmit(state.channels.start) }, [
		h('div', [
			'Axis: ',
			h('select.form-control', { name: 'axis' }, ['x', 'y', 'z'].map(function (axis) {
				return h('option', { selected: (state.axis === axis) }, axis);
			}))
		]),
		h('div', ['Amplitude: ', h('input.form-control', { type: 'number', name: 'amplitude', value: state.amplitude, step: 'any' }), ' °']),
		h('div', ['Frequency: ', h('input.form-control', { type: 'number', name: 'frequency', value: state.frequency, step: 'any' }), ' Hz']),
		h('div', ['Offset: ', h('input.form-control', { type: 'number', name: 'offset', value: state.offset, step: 'any' }), ' rad']),
		h('br'),
		h('.btn-group', [
			h('button.btn.btn-primary', { type: 'submit' }, 'Start'),
			h('button.btn.btn-danger', { type: 'button', 'ev-click': hg.sendClick(state.channels.stop) }, 'Stop')
		]),
		' ',
		h('button.btn.btn-default', { type: 'reset' }, 'Reset')
	]);
};

module.exports = SineDirection;
