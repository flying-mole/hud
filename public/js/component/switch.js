'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function Switch(id) {
	return hg.state({
		id: id,
		value: hg.value(false),
		disabled: hg.value(false),
		channels: {
			change: change
		}
	});
}

function change(state, data) {
	state.value.set(data.value);
}

Switch.render = function (state) {
	return h('.switch', [
		h('input', {
			type: 'checkbox',
			id: state.id,
			name: 'value',
			disabled: state.disabled,
			'ev-event': hg.sendChange(state.channels.change)
		}),
		h('label', { htmlFor: state.id })
	]);
};

module.exports = Switch;
