'use strict';

var flatten = require('expand-flatten').flatten;
var exportFile = require('./export');

module.exports = function (quad) {
	var isRecording = false;
	var header = [];
	var lines = [];

	var firstOrientation = true;
	function appendOrientation(data) {
		data = flatten(data);

		if (firstOrientation) {
			firstOrientation = false;
			header = header.concat(Object.keys(data));
		}

		var line = new Array(header.length);
		for (var i = 0; i < header.length; i++) {
			var key = header[i];

			if (typeof data[key] === 'undefined') {
				continue;
			}

			line[i] = data[key];
		}
		lines.push(line);
	}

	function appendMotorsSpeed(data) {
		// TODO
	}

	function appendCmd(data) {
		// TODO
	}

	return {
		start: function () {
			if (isRecording) return;

			this.reset();

			quad.on('orientation', appendOrientation);
			quad.on('motors-speed', appendMotorsSpeed);
			quad.cmd.on('orientation', appendCmd);
		},
		stop: function () {
			if (!isRecording) return;

			quad.removeListener('orientation', appendOrientation);
			quad.removeListener('motors-speed', appendMotorsSpeed);
			quad.cmd.removeListener('orientation', appendCmd);
		},
		reset: function () {
			lines = [];
		},
		export: function () {
			var csv = header.join(',') + '\n';

			for (var i = 0; i < lines.length; i++) {
				csv += lines[i].join(',') + '\n';
			}

			return exportFile({ body: csv, type: 'text/csv' });
		}
	};
};
