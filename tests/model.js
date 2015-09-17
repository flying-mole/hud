'use strict';

class Model {
	constructor(config) {
		this.config = config; // Quadcopter config

		this.t = 0; // Current time, in milliseconds
	}

	set motorsSpeed(speeds) {
		// TODO: do something with motor speeds
	}

	get orientation() {
		// TODO: compute orientation

		return {
			accel: { x: 0, y: 0, z: 0 },
			gyro: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0 },
			temp: 0
		};
	}
}

module.exports = Model;
