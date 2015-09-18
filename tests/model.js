'use strict';

class Model {
	constructor(config) {
		this.config = config; // Quadcopter config

		this.t = 0;
		this.motorsSpeed = null;
	}

	get orientation() {
		// TODO: compute orientation based on this.t and this.motorsSpeed

		return {
			accel: { x: 0, y: 0, z: 0 },
			gyro: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0 },
			temp: 0
		};
	}

	reset() {
		this.t = 0;
	}
}

module.exports = Model;
