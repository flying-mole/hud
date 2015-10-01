var Splitter = require('stream-split');
var through = require('through');

var nalSeparator = new Buffer([0, 0, 0, 1]); // NAL break

module.exports = function () {
	var splitter = new Splitter(nalSeparator);

	return splitter.pipe(through(function (data) {
		this.queue(Buffer.concat([nalSeparator, data]));
	}));
};
