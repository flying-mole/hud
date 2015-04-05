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

function QuadcopterSchema(svg) {
	this.svg = $(svg);
}
QuadcopterSchema.prototype.setSpeed = function (speed) {
	var colorOffset = -150;
	var propellers = this.svg.find('#propellers > g');

	for (var i = 0; i < speed.length; i++) {
		var s = speed[i];
		var color = getColorForPercentage(1 - s);

		var rgb = 'rgb(' + [color.r+colorOffset, color.g+colorOffset, color.b+colorOffset].join(',') + ')';
		$(propellers[i]).css('fill', rgb);
	}
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
	var quadMotors;

	// Inject SVGs
	var svgs = $('img[src$=".svg"]');
	SVGInjector(svgs, null, function () {
		quadMotors = new QuadcopterSchema('#quadcopter');
	});

	// Console
	var $console = $('#console pre');

	function log(msg) {
		$console.append(msg, '\n');
	}

	// Events handlers
	var handlers = {};

	handlers.error = function (event) {
		log('<span class="error">'+event.msg+'</span>');
	};
	handlers.info = function (event) {
		log('<span class="info">'+event.msg+'</span>');
	};

	handlers['motors-speed'] = function (event) {
		quadMotors.setSpeed(event.speed);
	};

	// Init
	log('Connecting to server...');

	ws = new WebSocket('ws://'+window.location.host+'/socket');
	ws.binaryType = 'arraybuffer';

	ws.addEventListener('open', function () {
		log('Connection opened.');
		init();
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