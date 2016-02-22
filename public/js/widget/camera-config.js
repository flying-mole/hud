'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var extend = require('extend');
var Tabs = require('../component/tabs');
var CameraProfile = require('./camera-profile');

function CameraConfig(quad) {
	var state = hg.state({
		tabs: Tabs(['preview', 'record']),
		profiles: hg.struct({
			preview: CameraProfile(),
			record: CameraProfile()
		}),
		channels: {
			change: function (state, data) {}
		}
	});

	quad.on('config', function (config) {
		state.profiles.preview.config.set(config.camera.preview);
		state.profiles.record.config.set(config.camera.record);
	});
	quad.once('config', function (config) {
		state.profiles.preview.config(function (config) {
			quad.setConfig({ camera: { preview: config } });
		});
		state.profiles.record.config(function (config) {
			quad.setConfig({ camera: { record: config } });
		});
	});

	return state;
}

CameraConfig.render = function (state) {
	return h('div', [
		hg.partial(Tabs.render, state.tabs),
		Tabs.renderContainer(state.tabs, 'preview', [
			hg.partial(CameraProfile.render, state.profiles.preview)
		]),
		Tabs.renderContainer(state.tabs, 'record', [
			hg.partial(CameraProfile.render, state.profiles.record)
		])
	]);
};

module.exports = CameraConfig;
