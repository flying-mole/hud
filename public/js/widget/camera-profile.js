'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var Switch = require('../component/switch');
var formGroup = require('../component/form-group');

var exposures = [
	'auto',
	'night',
	'nightpreview',
	'backlight',
	'spotlight',
	'sports',
	'snow',
	'beach',
	'verylong',
	'fixedfps',
	'antishake',
	'fireworks'
];

var awbs = [
	'off',
	'auto',
	'sun',
	'cloud',
	'shade',
	'tungsten',
	'fluorescent',
	'incandescent',
	'flash',
	'horizon'
];

var meterings = [
	'',
	'average',
	'spot',
	'backlit',
	'matrix'
];

var drcs = [
	'off',
	'low',
	'medium',
	'high'
];

var modes = [
	'Auto',
	'1920x1080, 16:9, 1-30fps',
	'2592x1944, 4:3, 1-15fps',
	'2592x1944, 4:3, 0.1666-1fps',
	'1296x972, 4:3, 1-42fps',
	'1296x730, 16:9, 1-49fps',
	'640x480, 4:3, 42.1-60fps',
	'640x480, 4:3, 60.1-90fps'
];

function CameraProfile() {
	return hg.state({
		config: hg.value(),
		isoSwitch: Switch(),
		vstabSwitch: Switch(),
		channels: {
			change: change
		}
	});
}

function change(state, data) {
	if (!state.isoSwitch.value()) {
		delete data.ISO;
	}
	data.vstab = state.vstabSwitch.value();

	console.log(data);
}

CameraProfile.render = function (state) {
	if (!state.config) return h();

	return h('form.form-horizontal', {
		'ev-submit': hg.sendSubmit(state.channels.change)
	}, [
		formGroup('Sharpness', h('input', {
			type: 'range',
			name: 'sharpness',
			value: state.config.sharpness,
			min: -100,
			max: 100
		})),
		formGroup('Contrast', h('input', {
			type: 'range',
			name: 'contrast',
			value: state.config.contrast,
			min: -100,
			max: 100
		})),
		formGroup('Brightness', h('input', {
			type: 'range',
			name: 'brightness',
			value: state.config.brightness,
			min: 0,
			max: 100
		})),
		formGroup('Saturation', h('input', {
			type: 'range',
			name: 'saturation',
			value: state.config.saturation,
			min: -100,
			max: 100
		})),
		formGroup('ISO', [
			Switch.render(state.isoSwitch),
			h('input', {
				type: 'range',
				name: 'ISO',
				value: state.config.ISO,
				disabled: !state.isoSwitch.value,
				min: 100,
				max: 800
			})
		]),
		formGroup('Stabilisation', Switch.render(state.vstabSwitch)),
		formGroup('EV compensation', h('input', {
			type: 'range',
			name: 'ev',
			value: state.config.ev,
			min: -10,
			max: 10
		})),
		formGroup('Exposure', h('select.form-control', {
			name: 'exposure'
		}, exposures.map(function (item) {
			return h('option', { selected: (state.config.exposure === item) }, item);
		}))),
		formGroup(h('abbr', { title: 'Automatic White Balance' }, 'AWB'), h('select.form-control', {
			name: 'awb'
		}, awbs.map(function (item) {
			return h('option', { selected: (state.config.awb === item) }, item);
		}))),
		formGroup('Metering', h('select.form-control', {
			name: 'metering'
		}, meterings.map(function (item) {
			return h('option', { value: item, selected: (state.config.metering === item) }, item || 'default');
		}))),
		formGroup(h('abbr', { title: 'Dynamic Range Compression' }, 'DRC'), h('select.form-control', {
			name: 'drc'
		}, drcs.map(function (item) {
			return h('option', { selected: (state.config.drc === item) }, item);
		}))),
		formGroup('Mode', h('select.form-control', {
			name: 'mode'
		}, modes.map(function (title, i) {
			return h('option', { value: i, selected: (state.config.mode === i) }, title);
		}))),
		formGroup('Size', [
			'Width: ', h('input.form-control', {
				type: 'number',
				name: 'width',
				value: state.config.width
			}), 'px',
			h('br'),
			'Height: ', h('input.form-control', {
				type: 'number',
				name: 'height',
				value: state.config.height
			}), 'px'
		]),
		formGroup(h('abbr', { title: 'Frames Per Second' }, 'FPS'), h('input.form-control', {
			type: 'number',
			name: 'framerate',
			value: state.config.framerate
		})),
		h('.form-group', h('.col-sm-offset-2.col-sm-10', [
			h('button.btn.btn-primary', { type: 'submit' }, 'Submit'),
			' ',
			h('button.btn.btn-default', { type: 'reset' }, 'Reset')
		]))
	]);
};

module.exports = CameraProfile;
