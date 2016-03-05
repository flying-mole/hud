var throttle = require('throttleit');

module.exports = function (cmd) {
	return function (state) {
		if (!state.x || !state.y) {
			throw new Error('Provided state is missing values x, y');
		}

		function update() {
			cmd.send('orientation', {
				x: state.x(),
				y: state.y(),
				z: (state.z) ? state.z() : 0
			});
		}

		var throttled = throttle(update, 100);

		state.x(throttled);
		state.y(throttled);
		if (state.z) {
			state.z(throttled);
		}

		// TODO: power
	};
};
