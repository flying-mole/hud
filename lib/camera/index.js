'use strict';

var fs = require('fs');
var extend = require('extend');
var createStream = require('./stream');
var splitter = require('./splitter');

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

	get broadcastStream() {
		if (!this._recorder) return;
		if (this._broadcastStream) return this._broadcastStream;

		var cameraStream = this.stream;
		var splitterStream = cameraStream.pipe(splitter());

		var broadcastStream = cameraStream.pipe(splitterStream);
		this._broadcastStream = broadcastStream;

		return broadcastStream;
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

		return createStream(opts);
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

		this._broadcastStream = null;

		console.log('Camera stopped');
	}
	
	check() {
		return new Promise(function (resolve, reject) {
			var recorder = createStream({
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
