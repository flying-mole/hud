'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var AttributeHook = require('../hook/attribute');

function RotationInput(quad) {
	// TODO

	return hg.state({
		value: hg.value(0),
		channels: {
			change: change
		}
	});
}

function change(state, data) {
	state.value.set(parseFloat(data.power) / 100);
}

RotationInput.render = function (state) {
	return h('div', [
		h('strong', 'Rotation'),
		h('input', {
			type: 'range',
			name: 'power',
			value: state.value * 100,
			min: -100,
			max: 100,
			step: 5,
			orient: AttributeHook('vertical'),
			'ev-event': hg.sendChange(state.channels.change)
		})
	]);
};

module.exports = RotationInput;
