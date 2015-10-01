function StepInput(cmd) {
	this._cmd = cmd;
}

StepInput.prototype.start = function(opts) {
	this.stop();

	var cmd = this._cmd;

	cmd.send('orientation', {
		x: opts.x,
		y: opts.y,
		z: opts.z
	});

	if (opts.duration) {
		this._timeout = setTimeout(function () {
			cmd.send('orientation', {
				x: 0,
				y: 0,
				z: 0
			});
		}, opts.duration);
	}
};

StepInput.prototype.stop = function () {
	clearTimeout(this._timeout);
};

module.exports = StepInput;
