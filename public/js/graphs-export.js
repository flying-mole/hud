var header, data;
var isRecording = false;

var graphsExport = {
	start: function () {
		isRecording = true;
		this._startTime = new Date().getTime();
		this.reset();
	},
	stop: function () {
		isRecording = false;
	},
	reset: function () {
		header = ['timestamp'];
		data = [];
	},
	isRecording: function () {
		return isRecording;
	},
	append: function (name, timestamp, dataset) {
		if (!isRecording) return;

		var lastline = data[data.length - 1];

		var line = new Array(header.length);
		line[0] = (timestamp - this._startTime)/1000;

		var hasPushedNewData = false;
		for (var key in dataset) {
			var value = dataset[key];
			if (typeof value == 'undefined') continue;
			var headerKey = name+'.'+key;
			var i = header.indexOf(headerKey);
			if (i >= 0) {
				if (lastline && !hasPushedNewData && typeof lastline[i] != 'number') {
					lastline[i] = value;
				} else {
					line[i] = value;
					hasPushedNewData = true;
				}
			} else {
				header.push(headerKey);
				if (lastline) {
					lastline.push(value);
				} else {
					line.push(value);
					hasPushedNewData = true;
				}
			}
		}

		if (hasPushedNewData) {
			data.push(line);
		}
	},
	toCsv: function () {
		if (!data || !header) return;

		var csv = '';
		csv += header.join(',');

		for (var i = 0; i < data.length; i++) {
			var line = data[i].join(',');
			csv += '\n'+line;
		}

		return csv;
	}
};

module.exports = graphsExport;
