var BSON = bson().BSON;
var ws;

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

	$('#power-input').on('input', function () {
		var val = parseFloat($(this).val()) / 100;
		sendCommand('power', val);
	});
}

$(function () {
	var $console = $('#console pre');

	function log(msg) {
		$console.append(msg, '\n');
	}


	var handlers = {};

	handlers.error = function (event) {
		log('<span class="error">'+event.msg+'</span>');
	};


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
		}

		handlers[msg.type](msg);
	});
});