function RampInput(cmd) {
	this._cmd = cmd;
}

RampInput.prototype.start = function(opts) {
	this.stop();

	var cmd = this._cmd;

	var startedAt = (new Date()).getTime();
	this._interval = setInterval(function () {
		var t = ((new Date()).getTime() - startedAt) / 1000;
		var orientation = { x: 0, y: 0, z: 0 };
		orientation[opts.axis] = opts.slope * t;
		cmd.send('orientation', orientation);
	}, 200);
};

RampInput.prototype.stop = function () {
	clearInterval(this._interval);
};

module.exports = RampInput;
