'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function StepDirection() {
	return hg.state({
		x: hg.value(0),
		y: hg.value(0),
		z: hg.value(0),
		channels: {
			send: send
		}
	});
}

function send(state, data) {
	state.x.set(parseFloat(data.x) || 0);
	state.y.set(parseFloat(data.y) || 0);
	state.z.set(parseFloat(data.z) || 0);
}

StepDirection.render = function (state) {
	return h('form.form-inline', { 'ev-submit': hg.sendSubmit(state.channels.send) }, [
		h('div', ['x: ', h('input.form-control', { type: 'number', name: 'x', value: state.x, step: 'any' }), ' °']),
		h('div', ['y: ', h('input.form-control', { type: 'number', name: 'y', value: state.y, step: 'any' }), ' °']),
		h('div', ['z: ', h('input.form-control', { type: 'number', name: 'z', value: state.z, step: 'any' }), ' °']),
		h('br'),
		h('button.btn.btn-primary', { type: 'submit' }, 'Send'),
		' ',
		h('button.btn.btn-default', { type: 'reset' }, 'Reset')
	]);
};

module.exports = StepDirection;
