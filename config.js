module.exports = {
	"physics": {
		"gravity": 9.81, // cst
		"motorMass": 50, // en grammes
		"structureMass": 30, // en grammes
		"diagonalLength": 45 // distance moteur-moteur en cm
	},
	"mpu6050": {
		"device": 1,
		"address": "0x68",
		"calibration": {}
	},
	"servos": {
		"pins": [0, 1, 2, 3],
		"range": [85, 140, 185],
		"initPeriod": 100,
		"massToPeriod": [91.344803622, 0.0676439999, 0.0000557704991374891] // coeffs for cst, x and x²
	},
	"broadcastInterval": {
		"osStatus": 10,
		"orientation": 1
	},
	"pid": {
		"interval": 100,
		"values": { // cst for PIDs: [k_P, k_I, k_D]
			"rate": {
				"x": [0.05, 0, 0],
				"y": [0.05, 0, 0],
				"z": [0.05, 0, 0]
			},
			"stabilize": {
				"x": [0, 0, 0],
				"y": [0, 0, 0],
				"z": [0, 0, 0]
			}
		}
	},
	"server": {
		"port": 3000
	},
	"camera": {
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
	}
};
