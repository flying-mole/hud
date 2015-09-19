'use strict';

class Model {
	constructor(config) {
		this.config = config; // Quadcopter config

		this.reset();
	}

	get orientation() {
		// TODO: compute orientation based on this.t and this.motorsForces
		
		var x = this.lastx + this.motorsForces[0] * 0.1;
		this.lastx = x;

		return {
			accel: { x: 0, y: 0, z: 0 },
			gyro: { x: 0, y: 0, z: 0 },
			rotation: { x: x, y: 0 },
			temp: 0
		};
	}

	reset() {
		this.t = 0; // Current time in ms
		this.motorsForces = [0, 0, 0, 0]; // Motors forces in Newtons

		this.lastx = 0;
	}
}

module.exports = Model;
