'use strict';

var BaseUpdater = require('./_base');

/**
 * The physics updater.
 * Use physic equations to stabilize the quadcopter.
 * TODO: works only for the bicopter for now!
 */
class PhysicsUpdater extends BaseUpdater {
	constructor(quad) {
		super(quad);

		this.reset();
	}

	get name() {
		return 'physics';
	}

	setTarget(target) {
		this.target = target;
	}

	reset() {
		this.lastDF = 0;
		this.thetaTh = 0; // Le theta prévu à la fin de chaque frame, theta théorique.
		// Il nous permettra de quantifier les perturbations.
	}

	update(data) {
		// Set update time
		var now = Date.now();
		var dt = 1;
		if (this.lastUpdate) {
			dt = (now - this.lastUpdate) / 1000;
		}
		this.lastUpdate = now;

		var physics = this.quad.config.physics;

		var structM = physics.structureMass / 1000; // g to kg
		var motorM = physics.motorMass / 1000; // g to kg
		var d = physics.diagonalLength / 100; // cm to m, distance between two motors -- l = d/2
		var l = d / 2;
		var boxM = physics.boxMass / 1000; // g to kg
		var boxH = physics.boxHeight / 100; // cm to m
		var omega = 5.82; //en rad/s
		var force = physics.linearRegressionForce;

		var Q = l*l * (structM / 3 + 2 * motorM) + boxM * boxH * boxH;

		//----------------------------------------------------------------------------------------------------------------
		// thetaConsigne à récupérer !!!
		var thetaConsigne = this.target.x;
		var ecart = 0.0;

		// On suppose que l'on tourne autour de l'axe x.
		var theta0 = data.rotation.x;
		var omega0 = data.gyro.x;

		var maxDeltaF = 8;

		var alpha = 0.0;
		var beta = 0.0;
		var E = 0.0;

		// Constante de frottements.
		var c = -2 * Math.sqrt(boxM * 9.81 * boxH * Q - omega * omega * Q * Q);

		// On compte le nombre de deltaForce qui nous mène dans l'écart autour de l'angle voulu.
		var compte = 0;
		var nextTheta = [];
		var ecartF = []; // Stocke les écart d'angle finaux (pour chaque deltaF).
		var vitesseF = []; // Stocke la vitesse final.
		var rentre = []; // Stocke 1 ou 0 : sert à savoir si l'écrat final est plus petit que l'écart demandé ou non.
		var i = 0;

		// Pour chaque deltaF, on calcule la vitesse final et l'éart final avec l'angle voulue (donc à t = dt).
		// On prendra les valeurs les plus intéressantes après.
		for(i = 0; i <= maxDeltaF; i++)
		{
			// Calcul des contantes d'intégration.
			E = l * i * force / (9.81 * boxM * boxH);
			alpha = theta0 - E;
			beta = (omega0 - c * alpha / 2 / Q) / omega;

			nextTheta.push(Math.abs(Math.exp(c/2/Q*dt) *(alpha * Math.cos(omega * dt) + beta * Math.sin(omega * dt)) + E));
			ecartF.push(Math.abs(Math.exp(c/2/Q*dt) *(alpha * Math.cos(omega * dt) + beta * Math.sin(omega * dt)) + E - thetaConsigne));
			if(ecartF[i] <= ecart)
			{
				++compte;
				rentre.push(1);
			}
			else
				rentre.push(0);
			vitesseF.push(Math.exp(c/2/Q*dt) * (c/2/Q*(alpha * Math.cos(omega*dt) + beta * Math.sin(omega*dt)) - alpha * omega * Math.sin(omega*dt) + beta * omega * Math.cos(omega*dt)));
		}

		// Sélection du deltaF le plus intéressant.
		var deltaF;

		if(compte == 1)
		{
			// Un seul deltaF convient.
			for(i = 0; i <= maxDeltaF; i++)
			{
				if(rentre[i] == 1)
				{
					deltaF = i;
					i = maxDeltaF;
				}
			}
		}
		else if(compte == 0)
		{
			// Aucun deltaF convient.
			// On cherche alors le deltaF qui nous donne le plus petit écart possible entre l'angle final et la valeur de consigne.
			var mini = ecartF[0];
			deltaF = 0;
			for(i = 1; i <= maxDeltaF; i++)
			{
				if(ecartF[i] < mini)
				{
					mini = ecartF[i];
					deltaF = i;
				}
			}
		}
		else // donc compte > 1
		{
			// Plusieurs deltaF conviennent.
			// On a le choix entre plusieurs deltaF qui entrent dans l'écart voulu, on prend celui qui donne la vitesse finale la plus faible.
			var vf = Infinity;
			for(i = 0; i <= maxDeltaF; i++)
			{
				if(rentre[i] == 1 && vitesseF[i] < vf)
				{
					vf = vitesseF[i];
					deltaF = i;
				}
			}
		}

		// On a ainsi deltaF le delta de force à appliquer entre les 2 moteurs.
		// return deltaF;
		// Il faut maintenant le convertir dans l'unité voulue pour le return.
		// De plus, on a un deltaF en valeur absolue, il faut trouver dans quel sens doit tourner le bicoptère.

		var sign = (this.target.x - data.rotation.x);
		if (sign != 0) {
			sign /= Math.abs(sign);
		} else {
			sign = 0;
		}

		// Pas sur de si on veut vraiment garder ça...
		if(Math.abs(this.lastDF - deltaF) > 2)
		{
			if(deltaF < this.lastDF)
				deltaF = this.lastDF - 2;
			else
				deltaF = this.lastDF + 2;
		}

		// A checker, peut être source de bugs (mauvais signe).
		this.thetaTh = nextTheta[deltaF] * sign;
		this.lastDF = deltaF;

		return {
			x: sign * deltaF * force,
			y: 0,
			z: 0
		};
	}
}

module.exports = PhysicsUpdater;
