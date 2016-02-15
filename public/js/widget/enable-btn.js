'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var Switch = require('../component/switch');

function EnableBtn(quad) {
	var sw = Switch('enable-switch');	

	var state = hg.state({
		switch: sw,
		value: sw.value
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

EnableBtn.render = function (state) {
	return h('div', { title: 'Alt+S to start/stop, Esc to stop' }, [
		Switch.render(state.switch),
		h('label', { htmlFor: state.switch.id }, 'ENABLE')
	]);
};

module.exports = EnableBtn;
