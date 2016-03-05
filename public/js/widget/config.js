'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var extend = require('extend');
var expand = require('expand-flatten').expand;
var exportFile = require('../export');
var formGroup = require('../component/form-group');

function Config(quad) {
	var state = hg.state({
		config: hg.value(),
		channels: {
			change: function (state, data) {
				data = cast(state.config(), expand(data));
				quad.cmd.send('config', data);
			},
			export: function (state) {
				exportFile({
					type: 'application/json',
					body: JSON.stringify(state.config(), null, '\t')
				});
			}
		}
	});

	quad.on('config', function (config) {
		state.config.set(config);
	});

	quad.cmd.on('config', function (config) {
		state.config.set(extend(state.config(), config));
	});

	return state;
}

function cast(from, to) {
	if (from instanceof Array) {
		to = Object.keys(to).map(function (key, i) {
			return cast(from[i], to[key]);
		});
	} else if (typeof from === 'object') {
		for (var key in to) {
			to[key] = cast(from[key], to[key]);
		}
	} else if (typeof from === 'number') {
		if (typeof to === 'string') {
			to = parseFloat(to);
		}
	}

	return to;
}

Config.render = function (state) {
	if (!state.config) {
		return h('div');
	}

	return h('form.form-horizontal', { 'ev-submit': hg.sendSubmit(state.channels.change) }, [
		h('.row', [
			h('.col-sm-6', [
				hg.partial(servos, state.config.servos),
				hg.partial(broadcastInterval, state.config.broadcastInterval),
				//hg.partial(physics, state.config.physics)
			]),
			h('.col-sm-6', controller(state.config))
		]),
		h('.row', h('.col-xs-12', h('.form-group', h('.col-sm-offset-2.col-sm-10', [
			h('button.btn.btn-primary', { type: 'submit' }, 'Update'),
			' ',
			h('button.btn.btn-default', {
				type: 'button',
				'ev-click': hg.sendClick(state.channels.export)
			}, 'Export')
		]))))
	]);
};

function servos(state) {
	return h('div', [
		formGroup('Servos pins', state.pins.map(function (pin, i) {
			return [h('input.form-control', {
				type: 'number',
				name: 'servos.pins.' + i,
				value: pin,
				size: 1
			}), ' '];
		})),
		formGroup('Servos PWM output range', [
			h('input.form-control', { type: 'number', name: 'servos.range.0', value: state.range[0] }),
			' - ',
			h('input.form-control', { type: 'number', name: 'servos.range.1', value: state.range[1] }),
			' (x10µs)'
		])
	]);
}

function broadcastInterval(state) {
	return formGroup('Broadcast interval', [
		h('div', [
			'OS status: ',
			h('input.form-control', {
				type: 'number',
				name: 'broadcastInterval.osStatus',
				value: state.osStatus,
				step: 'any'
			}),
			' s'
		]),
		h('div', [
			'Orientation: ',
			h('input.form-control', {
				type: 'number',
				name: 'broadcastInterval.orientation',
				value: state.orientation,
				step: 'any'
			}),
			' s'
		])
	]);
}

function physics(state) {
	return formGroup('Physics', [
		h('div', [
			'Motor mass: ',
			h('input.form-control', {
				type: 'number',
				name: 'physics.motorMass',
				value: state.motorMass,
				step: 'any'
			}),
			' g'
		]),
		h('div', [
			'Structure mass: ',
			h('input.form-control', {
				type: 'number',
				name: 'physics.structureMass',
				value: state.structureMass,
				step: 'any'
			}),
			' g'
		]),
		h('div', [
			'Diagonal length: ',
			h('input.form-control', {
				type: 'number',
				name: 'physics.diagonalLength',
				value: state.diagonalLength,
				step: 'any'
			}),
			' cm'
		])
	]);
}

function controller(state) {
	return formGroup('Controller', [
		h('div', [
			'Interval: ',
			h('input.form-control', {
				type: 'number',
				name: 'controller.interval',
				value: state.controller.interval,
				step: 'any',
				min: 0
			}),
			' ms'
		]),
		updaters(state)
	]);
}

function updaters(state) {
	var config = state.updaters[state.controller.updater];
	switch (state.controller.updater) {
	case 'stabilize-simple':
		return [
			h('div', [
				'Rate PID: ',
				pid('updaters.stabilize-simple.rate', config.rate)
			]),
			h('div', [
				'Stabilize PID: ',
				pid('updaters.stabilize-simple.stabilize', config.stabilize)
			])
		];
	}

	return '';
}

function pid(prefix, values) {
	return values.map(function (val, i) {
		return [h('input.form-control', {
			type: 'number',
			name: prefix + '.' + i,
			value: val,
			step: 'any'
		}), ' '];
	});
}

module.exports = Config;
