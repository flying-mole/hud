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
	var recordBtn;
	if (!state.recording) {
		recordBtn = h('button.btn.btn-danger', {
			title: 'Record',
			'ev-click': hg.sendClick(state.channels.start)
		}, h('span.glyphicon.glyphicon-record'));
	} else {
		recordBtn = h('button.btn.btn-danger', {
			title: 'Stop recording',
			'ev-click': hg.sendClick(state.channels.stop)
		}, h('span.glyphicon.glyphicon-stop'));
	}

	return h('.btn-group', [
		recordBtn,
		h('button.btn.btn-default', {
			'ev-click': hg.sendClick(state.channels.export)
		}, 'Export')
	]);
};

module.exports = ChartRecorder;
