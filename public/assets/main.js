var BSON = bson().BSON;
var ws;

var percentColors = [
	{ pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
	{ pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
	{ pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } } ];

var getColorForPercentage = function(pct) {
	for (var i = 1; i < percentColors.length - 1; i++) {
		if (pct < percentColors[i].pct) {
			break;
		}
	}
	var lower = percentColors[i - 1];
	var upper = percentColors[i];
	var range = upper.pct - lower.pct;
	var rangePct = (pct - lower.pct) / range;
	var pctLower = 1 - rangePct;
	var pctUpper = rangePct;
	var color = {
		r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
		g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
		b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
	};
	return color;
}

/**
 * @see http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
 */
var shadeColor = function (color, p) {
	var t = (p < 0) ? 0 : 255,
		p = (p < 0) ? p*-1 : p;

	return {
		r: Math.round((t-color.r)*p)+color.r,
		g: Math.round((t-color.g)*p)+color.g,
		b: Math.round((t-color.b)*p)+color.b
	};
};

var colorToRgb = function (color) {
	return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
};

function Joystick(el, oninput) {
	var that = this;

	this.joystick = $(el);
	this.handle = this.joystick.find('.handle');

	var joystickSize = {
		width: this.joystick.width(),
		height: this.joystick.height()
	};
	var handleSize = {
		width: this.handle.width(),
		height: this.handle.height()
	};

	this.pressed = true;

	var offset;
	this.joystick.on('mousedown mousemove mouseup', function (event) {
		if ((event.type == 'mousemove' && event.buttons) || event.type == 'mousedown') {
			if (!that.pressed) {
				that.joystick.addClass('active');
				that.pressed = true;

				offset = that.joystick.offset();
			}

			var x = event.pageX - offset.left - handleSize.width/2,
				y = event.pageY - offset.top - handleSize.height/2;

			that.handle.css({
				left: x,
				top: y
			});

			// In degrees
			oninput({
				alpha: 0,
				beta: (x - joystickSize.width/2) / joystickSize.width * 90, // front-to-back tilt in degrees, where front is positive
				gamma: (y - joystickSize.height/2) / joystickSize.height * 90 // left-to-right tilt in degrees, where right is positive
			});
		} else {
			if (that.pressed) {
				that.joystick.removeClass('active');
				that.handle.css({
					left: joystickSize.width/2 - handleSize.width/2,
					top: joystickSize.height/2 - handleSize.height/2
				});
				that.pressed = false;

				oninput({
					alpha: 0,
					beta: 0,
					gamma: 0
				});
			}
		}
	});
	this.joystick.trigger('mouseup');
}

function DeviceOrientationJoystick(oninput) {
	if (!DeviceOrientationJoystick.isSupported()) {
		throw new Error('DeviceOrientation not supported');
	}

	window.addEventListener('deviceorientation', function (event) {
		oninput({
			alpha: event.alpha,
			beta: event.beta, // front-to-back tilt in degrees, where front is positive
			gamma: event.gamma // left-to-right tilt in degrees, where right is positive
		});
	}, false);
}
DeviceOrientationJoystick.isSupported = function () {
	return (typeof window.DeviceOrientationEvent != 'undefined');
};

function QuadcopterSchema(svg) {
	this.svg = $(svg);
}
QuadcopterSchema.prototype.setSpeed = function (speed) {
	var propellers = this.svg.find('#propellers > g');

	for (var i = 0; i < speed.length; i++) {
		var s = speed[i];
		var color = shadeColor(getColorForPercentage(1 - s), -0.5);
		$(propellers[i]).css('fill', colorToRgb(color));
	}
};
QuadcopterSchema.prototype.setRotation = function (rot) {
	this.svg.css('transform', 'rotate('+rot+'deg)');
};

function sendCommand(cmd, opts) {
	ws.send(BSON.serialize({
		cmd: cmd,
		opts: opts
	}));
}

function init() {
	var joystick = new Joystick('#direction-input', function (data) {
		//sendCommand('orientation', data);
		//TODO
		sendCommand('rotation-speed', {
			x: data.beta,
			y: data.gamma,
			z: data.alpha
		});
	});

	if (DeviceOrientationJoystick.isSupported()) {
		var $switch = $('#orientation-switch');
		var devOrientation = new DeviceOrientationJoystick(function (data) {
			if ($switch.prop('checked')) {
				sendCommand('orientation', data);
			}
		});
	}

	var lastPower;
	$('#power-input').on('input', function () {
		var val = parseFloat($(this).val());
		if (lastPower === val) {
			return;
		}

		lastPower = val;
		sendCommand('power', val / 100);
	});

	$('#power-switch').on('change', function () {
		sendCommand('enable', $(this).prop('checked'));
	});
}

$(function () {
	var schemas = {};

	// Console
	var $console = $('#console pre');

	function log(msg, type) {
		if (type) {
			msg = '<span class="'+type+'">'+msg+'</span>';
		}
		$console.append(msg, '\n');
	}

	// Events handlers
	var handlers = {};

	handlers.error = function (event) {
		log(event.msg, 'error');
	};
	handlers.info = function (event) {
		log(event.msg, 'info');
	};

	handlers['motors-speed'] = function (event) {
		schemas.top.setSpeed(event.speed);
		schemas.sideX.setSpeed(event.speed.slice(0, 2));
		schemas.sideY.setSpeed(event.speed.slice(2, 4));

		var $stats = $('#motors-stats');
		var speeds = event.speed.map(function (speed) {
			return Math.round(speed * 100);
		}).join('<br>');
		$stats.find('.motors-speed').html(speeds);
	};

	handlers.orientation = function (event) {
		schemas.sideX.setRotation(event.data.rotation.x);
		schemas.sideY.setRotation(event.data.rotation.y);

		var objectValues = function (obj) {
			var list = [];
			for (var key in obj) {
				list.push(obj[key]);
			}
			return list;
		};

		var $stats = $('#sensor-stats');
		$stats.find('.sensor-gyro').text(objectValues(event.data.gyro));
		$stats.find('.sensor-accel').text(objectValues(event.data.accel));
		$stats.find('.sensor-rotation').text(objectValues(event.data.rotation));
		$stats.find('.sensor-temp').text(event.data.temp);
	};

	handlers['os-stats'] = function (event) {
		var $stats = $('#os-stats');

		var loadavg = [];
		for (var i = 0; i < event.loadavg.length; i++) {
			var avg = event.loadavg[i];
			var pct = Math.round(avg * 100);
			loadavg.push('<span style="color: '+colorToRgb(shadeColor(getColorForPercentage(1 - avg), -0.5))+';">'+pct+'%</span>');
		}
		$stats.find('.os-loadavg').html(loadavg.join(', '));

		var memPct = event.mem.free / event.mem.total;
		$stats.find('.os-mem')
			.text(event.mem.free + '/' + event.mem.total + ' ('+Math.round(memPct * 100)+'%)')
			.css('color', colorToRgb(shadeColor(getColorForPercentage(1 - memPct), -0.5)));
	};

	// Inject SVGs
	var svgs = $('img[src$=".svg"]');
	SVGInjector(svgs, null, function () {
		schemas.top = new QuadcopterSchema('#quadcopter-top');
		schemas.sideX = new QuadcopterSchema('#quadcopter-side-x');
		schemas.sideY = new QuadcopterSchema('#quadcopter-side-y');

		// Init
		log('Connecting to server...');

		ws = new WebSocket('ws://'+window.location.host+'/socket');
		ws.binaryType = 'arraybuffer';

		ws.addEventListener('open', function () {
			log('Connection opened.');
			init();
		});

		ws.addEventListener('error', function (event) {
			console.error(error);
			log('Connection error!', 'error');
		});

		ws.addEventListener('close', function () {
			log('Connection closed.', 'info');
		});

		ws.addEventListener('message', function (event) {
			var msg = BSON.deserialize(new Uint8Array(event.data));
			
			if (!handlers[msg.type]) {
				console.error('Unsupported message type: "'+msg.type+'"');
				return;
			}

			handlers[msg.type](msg);
		});
	});
});