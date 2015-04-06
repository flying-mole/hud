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

			var x = event.clientX - offset.left - handleSize.width/2,
				y = event.clientY - offset.top - handleSize.height/2;

			that.handle.css({
				left: x,
				top: y
			});

			// TODO: return angle
			oninput([(x - joystickSize.width/2) / joystickSize.width,
				(y - joystickSize.height/2) / joystickSize.height]);
		} else {
			if (that.pressed) {
				that.joystick.removeClass('active');
				that.handle.css({
					left: joystickSize.width/2 - handleSize.width/2,
					top: joystickSize.height/2 - handleSize.height/2
				});
				that.pressed = false;

				oninput([0, 0]);
			}
		}
	});
	this.joystick.trigger('mouseup');
}

function DeviceOrientationJoystick(oninput) {
	if (!window.DeviceOrientationEvent) {
		throw new Error('DeviceOrientation not supported');
	}

	window.addEventListener('deviceorientation', function (event) {
		var tiltFB = eventData.beta, // front-to-back tilt in degrees, where front is positive
			tiltLR = eventData.gamma; // left-to-right tilt in degrees, where right is positive

		oninput([tiltFB, tiltLR]);
	}, false);
}

function QuadcopterSchema(svg) {
	this.svg = $(svg);
}
QuadcopterSchema.prototype.setSpeed = function (speed) {
	var propellers = this.svg.find('#propellers > g');

	for (var i = 0; i < speed.length; i++) {
		var s = speed[i];
		var color = shadeColor(getColorForPercentage(1 - s), -0.5);

		var rgb = 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
		$(propellers[i]).css('fill', rgb);
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
	var joystick = Joystick('#direction-input', function (pos) {
		sendCommand('direction', pos);
	});

	var lastPower;
	$('#power-input').on('input', function () {
		var val = parseFloat($(this).val());
		if (lastPower === val) {
			return;
		}

		lastPower = val;
		sendCommand('power', val / 100);
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
	};

	handlers.orientation = function (event) {
		schemas.sideX.setRotation(event.beta);
		schemas.sideY.setRotation(event.gamma);
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