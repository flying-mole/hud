module.exports = {
	"physics": {
		"gravity": 9.81, // cst
		"motorMass": 50, // in grams
		"structureMass": 30, // in grams
		"diagonalLength": 45, // motor-motor distance in cm
		"boxHeight": 8, // distance between the axis and the center of gravity of the box in cm
		"boxMass": 650, // mass of the box in grams
		"linearRegressionForce" : 0.13 // Regression linéaire de la force de la seconde expèrience,
	},
	"mpu6050": {
		"device": 1, // RaspberryPi I2C device (0 or 1)
		"address": "0x68", // Sensor I2C address
		"calibration": {} // Calibration data
	},
	"servos": {
		"pins": [0, 1, 2, 3], // ServoBlaster motor outputs
		"range": [85, 140, 185], // Motor commands range (minimum, safe maximum, unsafe maximum)
		"initPeriod": 100, // ESC initialization period
		"massToPeriod": [91.344803622, 0.0676439999, 0.0000557704991374891] // coeffs for cst, x and x²
	},
	"broadcastInterval": {
		"osStatus": 10, // How frequently is the OS status broadcast?
		"orientation": 0.2 // How frequently is the quad orientation broadcast?
	},
	"controller": {
		"interval": 100, // Call the updater each XX ms
		"updater": "dummy" // Default updater to use
	},
	"updaters": { // Updaters config
		"dummy": {
			"targetFactor": 0.2
		},
		"stabilize-simple": { // cst for PIDs: [k_P, k_I, k_D]
			"rate": [0.001, 0, 0],
			"stabilize": [2, 0.1, 0.1]
		},
		"rate-simple": {
			"rate": [0.001, 0, 0]
		},
		"physics": {}
	},
	"server": {
		"port": 3000 // HTTP server port
	},
	"camera": { // Camera setup - see https://www.raspberrypi.org/documentation/hardware/camera.md
		"preview": {
			"sharpness": 0,
			"contrast": 0,
			"brightness": 50,
			"saturation": 0,
			"ISO": null,
			"vstab": false,
			"ev": 0,
			"exposure": "auto",
			"awb": "auto",
			"imxfx": "none",
			"colfx": null,
			"metering": null,
			"rotation": null,
			"hflip": false,
			"vflip": false,
			"shutter": null,
			"drc": null,
			"mode": 1,
			"bitrate": null,

			"width": 400,
			"height": 400,
			"framerate": 10,
			"profile": "baseline"
		},
		"record": {
			"sharpness": 0,
			"contrast": 0,
			"brightness": 50,
			"saturation": 0,
			"ISO": null,
			"vstab": false,
			"ev": 0,
			"exposure": "auto",
			"awb": "auto",
			"imxfx": "none",
			"colfx": null,
			"metering": null,
			"rotation": null,
			"hflip": false,
			"vflip": false,
			"shutter": null,
			"drc": null,
			"mode": 1,
			"width": null,
			"height": null,
			"bitrate": null,
			"framerate": null
		},
		"previewWhenRecording": false
	},
	"debug": true
};
