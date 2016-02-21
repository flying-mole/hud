'use strict';

var flatten = require('expand-flatten').flatten;
var exportFile = require('./export');

module.exports = function (quad) {
	var isRecording = false;
	var startedAt = 0;
	var header = ['time'];
	var lines = [];

	function createAppender(prefix) {
		var isFirst = true;

		function newline() {
			var line = new Array(header.length);
			line[0] = (Date.now() - startedAt) / 1000;
			lines.push(line);
			return line;
		}

		return function append(data) {
			if (prefix) {
				data = { [prefix]: data };
			}

			data = flatten(data);

			if (isFirst) {
				isFirst = false;
				header = header.concat(Object.keys(data));
			}

			var line = lines[lines.length - 1] || newline();
			for (var i = 0; i < header.length; i++) {
				var key = header[i];

				if (typeof data[key] === 'undefined') {
					continue;
				}

				if (typeof line[i] !== 'undefined') {
					line = newline();
				}

				line[i] = data[key];
			}
		};
	}

	var appendOrientation = createAppender();
	var appendMotorsSpeed = createAppender('motorsSpeed');
	var appendCmd = createAppender('cmd');

	return {
		start: function () {
			if (isRecording) return;

			this.reset();
			startedAt = Date.now();

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
