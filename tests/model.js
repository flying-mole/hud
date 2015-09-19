'use strict';

class Model {
	constructor(config) {
		this.config = config; // Quadcopter config

		this.t = 0; // Current time in ms
		this.motorsForces = [0, 0, 0, 0]; // Motors forces in Newtons
	}

	get orientation() {
		// TODO: compute orientation based on this.t and this.motorsForces

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
