var util = require('util');
var EventEmitter = require('events').EventEmitter;

var MsgHandler = require('./msg-handler');
var Client = require('./client');

function Quadcopter() {
	EventEmitter.call(this);

	var props = {
		enabled: false,
		pidEnabled: true,
		power: 0,
		motorsSpeed: null
	};
	this._props = props;

	this._config = null;

	var that = this;

	Object.defineProperties(this, {
		enabled: {
			enumerable: true,
			get: function () {
				return props.enabled;
			},
			set: function (val) {
				// TODO
			}
		},
		pidEnabled: {
			enumerable: true,
			get: function () {
				return props.pidEnabled;
			},
			set: function (val) {
				// TODO
			}
		},
		config: {
			enumerable: true,
			get: function () {
				return that._config;
			},
			set: function (val) {
				// TODO
			}
		},
		power: {
			enumerable: true,
			get: function () {
				return props.power;
			},
			set: function (val) {
				// TODO
			}
		},
		orientation: {
			enumerable: true,
			get: function () {
				return props.orientation;
			},
			set: function (val) {
				// TODO
			}
		},
		rotationSpeed: { // TODO: remove this (just for testing)
			enumerable: true,
			get: function () {
				return props.rotationSpeed;
			},
			set: function (val) {
				// TODO
			}
		},
		motorsSpeed: {
			enumerable: true,
			get: function () {
				return props.motorsSpeed;
			}
		}
	});

	this.msgHandler = new MsgHandler(this);
	this.client = new Client(this);

	this.client.on('message', function (msg) {
		that.msgHandler.handle(msg);
	});
}
util.inherits(Quadcopter, EventEmitter);

Quadcopter.prototype.init = function (cb) {
	if (!cb) cb = function () {};

	this.client.connect(function (err) {
		if (err) return cb(err);

		cb(null);
	});
};

module.exports = Quadcopter;