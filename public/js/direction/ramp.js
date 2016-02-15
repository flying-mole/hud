'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function RampDirection() {
	return hg.state({
		x: hg.value(0),
		y: hg.value(0),
		z: hg.value(0),

		enabled: hg.value(false),
		axis: hg.value('x'),
		slope: hg.value(0),
		max: hg.value(0),

		channels: {
			start: start,
			stop: stop
		}
	});
}

function start(state, data) {
	if (state.enabled()) {
		stop(state);
	}

	state.enabled.set(true);

	state.axis.set(data.axis);
	state.slope.set(parseFloat(data.slope) || 0);
	state.max.set(parseFloat(data.max) || 0);

	var axis = state.axis(),
		slope = state.slope(),
		max = state.max();

	// Reset axis
	state[axis].set(0);

	var startedAt = Date.now();
	var interval = setInterval(function () {
		var t = (Date.now() - startedAt) / 1000;
		var val = t * slope;

		if (val > max) {
			val = max;
		}

		state[axis].set(val);

		if (val === max) {
			stop(state);
		}
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

RampDirection.render = function (state) {
	return h('form.form-inline', { 'ev-submit': hg.sendSubmit(state.channels.start) }, [
		h('div', [
			'Axis: ',
			h('select.form-control', { name: 'axis' }, ['x', 'y', 'z'].map(function (axis) {
				return h('option', { selected: (state.axis === axis) }, axis);
			}))
		]),
		h('div', ['Slope: ', h('input.form-control', { type: 'number', name: 'slope', value: state.slope, step: 'any' }), ' °/s']),
		h('div', ['Max: ', h('input.form-control', { type: 'number', name: 'max', value: state.max, step: 'any' }), ' °']),
		h('br'),
		h('.btn-group', [
			h('button.btn.btn-primary', { type: 'submit' }, 'Start'),
			h('button.btn.btn-danger', { type: 'button', 'ev-click': hg.sendClick(state.channels.stop) }, 'Stop')
		]),
		' ',
		h('button.btn.btn-default', { type: 'reset' }, 'Reset')
	]);
};

module.exports = RampDirection;
