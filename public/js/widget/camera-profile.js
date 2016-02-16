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
			return h('option', item);
		}))),
		formGroup(h('abbr', { title: 'Automatic White Balance' }, 'AWB'), h('select.form-control', {
			name: 'awb'
		}, awbs.map(function (item) {
			return h('option', item);
		}))),
		formGroup('Metering', h('select.form-control', {
			name: 'metering'
		}, meterings.map(function (item) {
			return h('option', { value: item }, item || 'default');
		})))
	]);
};

module.exports = CameraProfile;
