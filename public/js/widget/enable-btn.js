'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function EnableBtn(quad) {
	var state = hg.state({
		value: hg.value(false),
		channels: {
			change: change
		}
	});

	hg.watch(state.value, function (val) {
		if (quad.enabled == val) return;
		quad.cmd.send('enable', val); // TODO: move this in change() ?
	});

	quad.on('enabled', function (val) {
		state.value.set(val);
	});

	return state;
}

function change(state, value) {
	state.value.set(value.enabled);
}

EnableBtn.render = function (state) {
	return h('div', { title: 'Alt+S to start/stop, Esc to stop' }, [
		h('div.switch', [
			h('input', {
				type: 'checkbox',
				id: 'enable-switch',
				name: 'enabled',
				checked: state.value,
				'ev-event': hg.sendChange(state.channels.change)
			}),
			h('label', { htmlFor: 'enable-switch' })
		]),
		h('label', { htmlFor: 'enable-switch' }, 'ENABLE')
	]);
};

module.exports = EnableBtn;
