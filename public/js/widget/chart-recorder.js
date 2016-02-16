'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function ChartRecorder(quad) {
	return hg.state({
		channels: {
			start: function (state) {
				// TODO
			},
			stop: function (state) {
				// TODO
			},
			export: function (state) {
				// TODO
			}
		}
	});
}

ChartRecorder.render = function (state) {
	return h('.btn-group', [
		h('button.btn.btn-danger', {
			title: 'record',
			'ev-click': hg.sendClick(state.channels.start)
		}, h('span.glyphicon.glyphicon-record')),
		h('button.btn.btn-default', {
			'ev-click': hg.sendClick(state.channels.export)
		}, 'Export')
	]);
};

module.exports = ChartRecorder;
