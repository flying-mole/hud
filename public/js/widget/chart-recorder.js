'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var Recorder = require('../chart-recorder');

function ChartRecorder(quad) {
	var recorder = Recorder(quad);

	var state = hg.state({
		recording: hg.value(false),
		channels: {
			start: function (state) {
				recorder.start();
				state.recording.set(true);
			},
			stop: function (state) {
				recorder.stop();
				state.recording.set(false);
			},
			export: function (state) {
				recorder.export();
			}
		}
	});

	return state;
}

ChartRecorder.render = function (state) {
	return h('.btn-group', [
		h('button.btn.btn-danger', {
			title: 'Record',
			style: { display: (!state.recording) ? 'block' : 'none' },
			'ev-click': hg.sendClick(state.channels.start)
		}, h('span.glyphicon.glyphicon-record')),
		h('button.btn.btn-danger', {
			title: 'Stop recording',
			style: { display: (state.recording) ? 'block' : 'none' },
			'ev-click': hg.sendClick(state.channels.stop)
		}, h('span.glyphicon.glyphicon-stop')),
		h('button.btn.btn-default', {
			'ev-click': hg.sendClick(state.channels.export)
		}, 'Export'),
		h('p.text-danger', {
			style: { display: (state.recording) ? 'block' : 'none' }
		}, 'Recording...')
	]);
};

module.exports = ChartRecorder;
