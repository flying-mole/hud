'use strict';

var fs = require('fs');
var extend = require('extend');
var createStream = require('./stream');
var splitter = require('./splitter');

var recorder = Symbol(),
	broadcastStream = Symbol(),
	start = Symbol();

class Camera {
	constructor(quad) {
		var that = this;
		this.quad = quad;

		this[recorder] = null;
	}

	get enabled() {
		return (this[recorder]) ? true : false;
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
		if (!this[recorder]) return;
		return this[recorder].stdout;
	}

	get broadcastStream() {
		if (!this[recorder]) return;
		if (this[broadcastStream]) return this[broadcastStream];

		var cameraStream = this.stream;
		var splitterStream = cameraStream.pipe(splitter());

		var stream = cameraStream.pipe(splitterStream);
		this[broadcastStream] = stream;

		return stream;
	}

	[start](opts) {
		if (this[recorder]) this.stop();

		var that = this;

		opts = extend({
			timeout: 0
		}, opts);

		for (var key in Camera.defaultOptions) {
			var defaultValue = Camera.defaultOptions[key];
			if (opts[key] == defaultValue) {
				delete opts[key];
			}
		}

		var rec = createStream(opts);

		rec.on('error', function (err) {
			console.warn('WARN: camera error', err);
		});

		rec.on('exit', function (code) {
			if (code) {
				console.warn('WARN: camera error (#'+code+')');
			}

			that[recorder] = null;
			that[broadcastStream] = null;
		});

		return rec;
	}

	startPreviewing() {
		this[recorder] = this[start](this.quad.config.camera.preview);
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

		this[recorder] = this[start](this.quad.config.camera.record);
		console.log('Camera recording');

		if (this.quad.config.camera.previewWhenRecording) {
			var outputStream = fs.createWriteStream(outputPath);
			this[recorder].stdout.pipe(outputStream);
		}
	}

	stop() {
		if (!this[recorder]) return;

		this[recorder].kill();

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
