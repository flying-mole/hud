// See https://github.com/soliton4/nodeMirror/blob/master/src/avc/Wgt.js#L37
var concatUint8 = function (buffers) {
	var completeLength = 0;
	for (var i = 0; i < buffers.length; i++) {
		completeLength += buffers[i].length;
	}

	var data = new Uint8Array(completeLength);
	var filledLength = 0;
	for (var i = 0; i < buffers.length; i++) {
		data.set(buffers[i], filledLength);
		filledLength += buffers[i].length;
	}

	return data;
};

var buffers = [];
self.addEventListener('message', function (event) {
	var data = new Uint8Array(event.data);

	var zerosCount = 0;
	var lastOffset = 0;
	for (var i = 0; i < data.length; i++) {
		if (data[i] == 0) {
			zerosCount++;
		} else if (data[i] == 1 && zerosCount >= 3) {
			var offset = i - 3;
			var nal = data.subarray(lastOffset, offset);
			if (lastOffset == 0 && buffers.length) {
				buffers.push(nal);
				nal = concatUint8(buffers);
				buffers = [];
			}
			if (!nal.length) continue;

			self.postMessage(nal);

			lastOffset = offset;
			zerosCount = 0;
		} else if (zerosCount > 0) {
			zerosCount = 0;
		}
	}

	var remaining = data.subarray(offset);
	if (remaining.length) {
		buffers.push(remaining);
	}
}, false);