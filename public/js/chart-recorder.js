'use strict';

var flatten = require('expand-flatten').flatten;

module.exports = function (quad) {
	var isRecording = false;
	var header = [];
	var lines = [];

	function appendOrientation(data) {
		data = flatten(data);

		// TODO

		lines.push();
	}

	function appendMotorsSpeed() {
		// TODO
	}

	return {
		start: function () {
			if (isRecording) return;

			this.reset();

			quad.on('orientation', appendOrientation);
			quad.on('motors-speed', appendMotorsSpeed);
		},
		stop: function () {
			if (!isRecording) return;

			quad.removeListener('orientation', appendOrientation);
			quad.removeListener('motors-speed', appendMotorsSpeed);
		},
		reset: function () {
			lines = [];
		}
	};
};