'use strict';

class Model {
	constructor(config) {
		this.config = config; // Quadcopter config

		this.reset();
	}

	reset() {
		this.t = 0; // Current time in ms
		this.lastFrame = 0; // Time of the last Frame
		this.motorsForces = [0, 0, 0, 0]; // Motors forces in Newtons
		this.motorsSpeed = [0, 0, 0, 0]; // Motors speed, as sent to ESC

		// Rotation, vitesse de rotation et accélération actuelle en rad/s.
		// On considère les conditions initiales nulles.
		this.rotation = 0;
		this.vitesse = 0;
		this.acceleration = 0;
	}

	get orientation() {
		var physics = this.config.physics;
		
		var structM = physics.structureMass / 1000; // g to kg
		var motorM = physics.motorMass / 1000; // g to kg
		var d = physics.diagonalLength / 100; // cm to m, distance between two motors -- l = d/2
		var l = d/2;
		var boxM = physics.boxMass / 1000; // g to kg
		var boxH = physics.boxHeight / 100; // cm to m
		var omega = 5.82; //en rad/s

		var dt = this.t - this.lastFrame;
		dt /= 1000;
		if (dt <= 0) {
			return {
				accel: { x: 0, y: 0, z: 0 },
				gyro: { x: 0, y: 0, z: 0 },
				rotation: { x: 0, y: 0 },
				temp: 0
			};
		}
		this.lastFrame = this.t;

		// La force des moteurs : 
		var Fa = this.motorsForces[2];
		var Fb = this.motorsForces[0];
		
		// On quantifie les forces selon la première expérience (force polynomiale).
		// Polynome vitesse d'ordre en fonction de la force.
		var pa = 2.78212;
		var pb = -8.1778;
		var pc = 128.2618776;
		var ya = Math.round(Fa*Fa * pa + Fa * pb + pc);
		var yb = Math.round(Fb*Fb * pa + Fb * pb + pc);		
		
		/*console.log(Fa);
		console.log(Fb);
		console.log(ya);
		console.log(yb);*/
		
		// On recalcule les forces : 
		// Polynome force en fonction de la vitesse d'ordre.
		pa = -0.002074;
		pb = 0.65920397;
		pc = -47.587357;
		Fa = ya*ya * pa + ya * pb + pc;
		Fb = yb*yb * pa + yb * pb + pc;	
		
		/*console.log(Fa);
		console.log(Fb);*/
		
		var DeltaF = Fb - Fa;
		
		// Le fameux Q....
		var Q = l*l* (structM / 3 + 2 * motorM) + boxM * boxH * boxH;
		// Constante de frottements.
		var c = -2 * Math.sqrt(boxM * 9.81 * boxH * Q - omega * omega * Q * Q);
		
		// Les conditions initiales de la frame.
		var theta0 = this.rotation;
		var omega0 = this.vitesse;
		
		// Les constantes de l'équation : 
		var E = l * DeltaF / (boxM * 9.81 * boxH);
		var alpha = theta0 - E;
		var beta = (omega0 - c * alpha / 2 / Q) / omega;
		
		var rot = Math.exp(c/2/Q*dt) * (alpha*Math.cos(omega * dt) + beta*Math.sin(omega * dt)) + E;
		var gyro = c/2/Q * (rot - E) + Math.exp(c/2/Q*dt) * omega * (beta * Math.cos(omega * dt) - alpha * Math.sin(omega * dt));
		var accel = c/2/Q * gyro + c/2/Q * Math.exp(c/2/Q * dt) * omega * (beta * Math.cos(omega * dt) - alpha * Math.sin(omega * dt)) - omega * omega * (rot - E);
		
		this.rotation = rot;
		this.vitesse = gyro;
		this.acceleration = accel;
		
		rot *= 180 / Math.PI;
		// Simule l'erreur de capteur.
		rot += Math.random() - 0.5;
		
		// Retourne des degrés.
		return {
			accel: { x: accel / Math.PI * 180, y: 0, z: 0 },
			gyro: { x: gyro / Math.PI * 180, y: 0, z: 0 },
			rotation: { x: rot, y: 0 },
			temp: 0
		};
	}
}

module.exports = Model;
