var child = require('child_process');

var raspivid = function (options) {
	var args = [
		'--nopreview'
	];

	Object.keys(options || {}).forEach(function (key) {
		var val = options[key];

		args.push('--' + key);
		if (val || val === 0) {
			args.push(val);
		}
	});

	args.push('-o');
	args.push('-');

	return child.spawn('raspivid', args, {
		stdio: ['ignore', 'pipe', 'inherit']
	});
};

// Doesnt support non-seekable streams with mp4
var avconv = function () {
	var args = [
		'-i',
		'pipe:0',
		'-f',
		'mp4',
		'-loglevel',
		'error', // See http://blog.jungkyungsuk.com/tag/loglevel/
		'pipe:1'
	];

	return child.spawn('avconv', args, {
		stdio: ['pipe', 'pipe', 'inherit']
	});
};

// Doesn't support mp4 streaming
var cvlc = function () {
	var args = [
		'-I',
		'dummy',
		'-v',
		'v4l2:///dev/video0',
		'--v4l2-chroma',
		'h264',
		'--v4l2-width',
		'800',
		'--v4l2-height',
		'600',
		'--sout',
		//'#standard{access=file,mux=mp4,dst=-}',
		'#standard{access=http,mux=ts,dst=0.0.0.0:3001}', // TODO
		':demux=h264'
	];

	// cvlc v4l2:///dev/video0 --v4l2-width 800 --v4l2-height 600 --v4l2-chroma h264 --sout '#standard{access=http,mux=ts,dst=0.0.0.0:12345}' -vvv

	return child.spawn('cvlc', args, {
		stdio: ['pipe', 'pipe', 'inherit']
	});
};

function Camera(quad) {
	var that = this;

	this._options = {
		timeout: 0,
		profile: 'baseline',
		width: 200,
		height: 200,
		framerate: 10
	};

	this._recorder = null;

	Object.defineProperties(this, {
		enabled: {
			enumerable: true,
			get: function () {
				return (that._recorder) ? true : false;
			},
			set: function (val) {
				if (val) {
					that.start();
				} else {
					that.stop();
				}
			}
		},
		stream: {
			enumerable: true,
			get: function () {
				if (!that._recorder) return;
				return that._recorder.stdout;
			}
		}
	});
}

Camera.prototype.start = function () {
	if (this._recorder) return;

	var recorder = raspivid(this._options);

	this._recorder = recorder;

	console.log('Camera recording');
};

Camera.prototype.stop = function () {
	if (!this._recorder) return;

	this._recorder.kill();
	this._recorder = null;

	console.log('Camera stopped recording');
};

module.exports = Camera;