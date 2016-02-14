'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var AttributeHook = require('../hook/attribute');

function PowerInput(quad) {
	var state = hg.state({
		value: hg.value(0),
		channels: {
			change: change
		}
	});

	hg.watch(state.value, function (val) {
		if (quad.power === val) return;
		quad.power = val;
	});

	// TODO: debounce bug
	quad.on('power', function (val) {
		if (state.value() === val) return;
		state.value.set(val);
	});

	return state;
}

function change(state, data) {
	state.value.set(parseFloat(data.power) / 100);
}

PowerInput.render = function (state) {
	return h('div', { title: 'Arrow up/down' }, [
		h('strong', 'Power'),
		h('input', {
			type: 'range',
			name: 'power',
			value: state.value * 100,
			min: 0,
			max: 100,
			step: 5,
			orient: AttributeHook('vertical'),
			'ev-event': hg.sendChange(state.channels.change)
		})
	]);
};

module.exports = PowerInput;
