'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function ControllerBtn(quad) {
	var state = hg.state({
		value: hg.value('dummy'),
		updaters: hg.array([]),
		channels: {
			change: function (state, data) {
				state.value.set(data.controller);
				quad.setConfig({ controller: { updater: data.controller } });
			}
		}
	});

	quad.on('features', function (data) {
		state.updaters.set(data.updaters);
	});

	quad.on('config', function (config) {
		state.value.set(config.controller.updater);
	});

	return state;
}

ControllerBtn.render = function (state) {
	return h('div.form-inline', [
		h('label.control-label', { htmlFor: 'controller-btn' }, 'Controller:'),
		h('select#controller-btn.form-control', {
			name: 'controller',
			'ev-event': hg.sendChange(state.channels.change)
		}, state.updaters.map(function (name) {
			return h('option', { selected: (state.value === name) }, name);
		}))
	]);
};

module.exports = ControllerBtn;
