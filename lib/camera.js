'use strict';

var child = require('child_process');
var fs = require('fs');
var extend = require('extend');

var raspivid = function (options) {
	options = options || {};

	var args = [
		'--nopreview'
	];

	Object.keys(options).forEach(function (key) {
		var val = options[key];
		if (!val && val !== 0 && val !== '') return;

		args.push('--' + key);
		if ((val || val === 0) && val !== true && val !== '') {
			args.push(val);
		}
	});

	if (!options.output) {
		args.push('-o');
		args.push('-');
	}

	console.log('raspivid', args.join(' '));

	return child.spawn('raspivid', args, {
		stdio: ['ignore', 'pipe', 'inherit']
	});
};

// Doesn't support non-seekable streams with mp4
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

class Camera {
	constructor(quad) {
		var that = this;
		this.quad = quad;

		this._recorder = null;
	}
	
	get enabled() {
		return (this._recorder) ? true : false;
	}
	
	set previewing(val) {
		if (val) {
			this.startPreviewing();
		} else {
			this.stop();
		}
	}
	
	set recording(val) {
		if (val) {
			this.startRecording();
		} else {
			this.stop();
		}
	}
	
	get stream() {
		if (!this._recorder) return;
		return this._recorder.stdout;
	}
	
	_start(opts) {
		if (this._recorder) this.stop();

		opts = extend({
			timeout: 0
		}, opts);

		for (var key in Camera.defaultOptions) {
			var defaultValue = Camera.defaultOptions[key];
			if (opts[key] == defaultValue) {
				delete opts[key];
			}
		}

		return raspivid(opts);
	}
	
	startPreviewing() {
		this._recorder = this._start(this.quad.config.camera.preview);
		console.log('Camera previewing');
	}
	
	startRecording() {
		var outputPath = '/home/pi/output.h264';

		var opts = this.quad.config.camera.record;
		if (!this.quad.config.camera.previewWhenRecording) {
			// Do not modify global config when setting output
			opts = extend({}, opts, {
				'output': outputPath
			});
		}

		this._recorder = this._start(this.quad.config.camera.record);
		console.log('Camera recording');

		if (this.quad.config.camera.previewWhenRecording) {
			var outputStream = fs.createWriteStream(outputPath);
			this._recorder.stdout.pipe(outputStream);
		}
	}
	
	stop() {
		if (!this._recorder) return;

		this._recorder.kill();
		this._recorder = null;

		console.log('Camera stopped');
	}
	
	check() {
		return new Promise(function (resolve, reject) {
			var recorder = raspivid({
				timeout: 1,
				mode: 7,
				// Minimum width/height is 64px
				width: 64,
				height: 64
			});
		
			recorder.on('error', function (err) {
				reject(err);
			});
		
			recorder.on('exit', function (code) {
				if (code === 0) {
					resolve();
				} else {
					reject(code);
				}
			});
		});
	}
}

Camera.defaultOptions = {
	"sharpness": 0,
	"contrast": 0,
	"brightness": 50,
	"saturation": 0,
	"ISO": null,
	"vstab": false,
	"ev": 0,
	"exposure": "auto",
	"awb": "auto",
	"imxfx": "none",
	"colfx": null,
	"metering": null,
	"rotation": null,
	"hflip": false,
	"vflip": false,
	"shutter": null,
	"drc": null,
	"mode": 1,
	"width": null,
	"height": null,
	"bitrate": null,
	"framerate": null
};

module.exports = Camera;
