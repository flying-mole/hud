var Splitter = require('stream-split');
var through = require('through');
var Transform = require('stream').Transform;

var nalSeparator = new Buffer([0, 0, 0, 1]); // NAL break

module.exports = function () {
	/*var splitter = new Splitter(nalSeparator);
	return splitter.pipe(through(function (data) {
		this.queue(Buffer.concat([nalSeparator, data]));
	}));
	//return splitter;*/

	var buffers = [];

	return through(function (data) {
		var zerosCount = 0;
		var lastOffset = 0;

		for (var i = 0; i < data.length; i++) {
			if (data[i] == 0) {
				zerosCount++;
			} else if (data[i] == 1 && zerosCount >= 3) {
				var offset = i - 3;
				var frame = data.slice(lastOffset, offset);
				if (lastOffset == 0 && buffers.length) {
					buffers.push(frame);
					frame = Buffer.concat(buffers);
					buffers = [];
				}
				if (!frame.length) continue;

				this.queue(frame);

				lastOffset = offset;
				zerosCount = 0;
			} else if (zerosCount > 0) {
				zerosCount = 0;
			}
		}

		var remaining = data.slice(offset);
		if (remaining.length) {
			buffers.push(remaining);
		}
	});
};

