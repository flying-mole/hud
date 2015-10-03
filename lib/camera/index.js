'use strict';

var fs = require('fs');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var createStream = require('./stream');
var splitter = require('./splitter');

var enabled = Symbol(),
	recorder = Symbol(),
	broadcastStream = Symbol(),
	start = Symbol();

class Camera extends EventEmitter {
	constructor(quad) {
		super();

		var that = this;

		var configUpdated = function () {
			that.config = quad.config.camera;
		};
		quad.on('config', configUpdated);
		configUpdated();

		this[enabled] = false;
		this[recorder] = null;
	}

	get enabled() {
		return this[enabled];
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
		return this.stream;
		/*if (!this[recorder]) return;
		if (this[broadcastStream]) return this[broadcastStream];

		var cameraStream = this.stream;
		var splitterStream = cameraStream.pipe(splitter());

		var stream = cameraStream.pipe(splitterStream);
		this[broadcastStream] = stream;

		return stream;*/
	}

	[start](opts) {
		var that = this;

		if (this[recorder]) {
			return this.stop().then(function () {
				return that[start](opts);
			});
		}

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
			that.emit('error', err);
		});

		rec.on('exit', function (code) {
			if (code) {
				console.warn('WARN: camera error (#'+code+')');
			}

			that[recorder] = null;
			that[broadcastStream] = null;

			that.emit('stop');
			console.log('Camera stopped');
		});

		this[enabled] = true;
		this[recorder] = rec;

		that.emit('start');
	}

	startPreviewing() {
		this[start](this.config.preview);
		console.log('Camera previewing');
	}

	startRecording() {
		var outputPath = '/home/pi/output.h264';

		var opts = this.config.record;
		if (!this.config.previewWhenRecording) {
			// Do not modify global config when setting output
			opts = extend({}, opts, {
				'output': outputPath
			});
		}

		this[start](opts);
		console.log('Camera recording');

		if (this.config.previewWhenRecording) {
			var outputStream = fs.createWriteStream(outputPath);
			this[recorder].stdout.pipe(outputStream);
		}
	}

	stop() {
		if (!this[recorder]) return Promise.resolve();

		var that = this;

		this[enabled] = false;
		this[recorder].kill();

		return new Promise(function (resolve, reject) {
			that.once('stop', function () {
				resolve();
			});
		});
	}

	check() {
		return new Promise(function (resolve, reject) {
			var recorder = createStream({
				timeout: 1,
				mode: 7,
				framerate: 10,
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

