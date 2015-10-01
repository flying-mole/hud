function SineInput(cmd) {
	this._cmd = cmd;
}

SineInput.prototype.start = function(opts) {
	this.stop();

	var cmd = this._cmd;

	var A = opts.amplitude,
		f = opts.frequency,
		phi = opts.offset;

	var startedAt = (new Date()).getTime();
	this._interval = setInterval(function () {
		var t = ((new Date()).getTime() - startedAt) / 1000;
		var orientation = { x: 0, y: 0, z: 0 };
		orientation[opts.axis] = A * Math.sin(2 * Math.PI * f * t + phi);
		cmd.send('orientation', orientation);
	}, 200);
};

SineInput.prototype.stop = function () {
	clearInterval(this._interval);
};

module.exports = SineInput;
