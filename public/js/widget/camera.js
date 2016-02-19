'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var CameraPreview = require('../camera-preview');
var Canvas = require('../component/canvas');
var CameraConfig = require('./camera-config');

function Camera(quad) {
	var cameraPreview = new CameraPreview(quad.cmd);

	var state = hg.state({
		config: CameraConfig(quad),
		video: hg.value(),
		channels: {
			play: function () {
				cameraPreview.play();
			},
			pause: function () {
				cameraPreview.pause();
			},
			stop: function () {
				cameraPreview.stop();
			},
			record: function () {}
		}
	});

	cameraPreview.on('start', function () {
		state.video.set(cameraPreview.player.canvas);
	});
	cameraPreview.on('error', function (err) {
		console.error(err); // TODO: use UI console instead
	});

	return state;
}

Camera.render = function (state) {
	return h('.row', [
		h('.col-sm-6.col-xs-12', hg.partial(CameraConfig.render, state.config)),
		h('.col-sm-6.col-xs-12', [
			h('p#camera-video', (state.video) ? Canvas(state.video) : null),
			h('.text-center', [
				h('.btn-group', [
					h('button.btn.btn-default', {
						'ev-click': hg.sendClick(state.channels.play)
					}, h('span.glyphicon.glyphicon-play')),
					h('button.btn.btn-default', {
						'ev-click': hg.sendClick(state.channels.pause)
					}, h('span.glyphicon.glyphicon-pause')),
					h('button.btn.btn-default', {
						'ev-click': hg.sendClick(state.channels.stop)
					}, h('span.glyphicon.glyphicon-stop'))
				]),
				' ',
				h('button.btn.btn-danger', {
					title: 'Record',
					'ev-click': hg.sendClick(state.channels.record)
				}, h('span.glyphicon.glyphicon-record')),
				h('br'),
				h('p.text-danger', { style: { display: 'none' } }, 'Recording...')
			])
		]),
	]);
};

module.exports = Camera;
