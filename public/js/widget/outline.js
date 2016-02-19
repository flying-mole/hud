'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var colors = require('../colors');
var InlineSvg = require('../component/inline-svg');

function speedRatio(quad) {
	if (!quad.config) return function () { return 0; };

	var range = quad.config.servos.range;
	return function (speed) {
		return (speed - range[0]) / (range[1] - range[0]);
	};
}

function Outline(quad, url, motors, axis) {
	var state = hg.state({
		svg: InlineSvg(url),
		rotation: hg.value(0)
	});

	if (motors) {
		quad.on('motors-speed', function (speed) {
			var propellers = state.svg.element.querySelector('#propellers');
			if (!propellers) return;

			speed.filter(function (s, i) {
				return (motors.indexOf(i) !== -1);
			}).map(speedRatio(quad)).forEach(function (s, i) {
				var color = colors.shade(colors.getForPercentage(1 - s), -0.5);
				propellers.children[i].style.fill = colors.toRgb(color);
			});
		});
	}

	if (axis) {
		quad.on('orientation', function (data) {
			state.rotation.set(data.rotation[axis]);
		});
	}

	return state;
}

Outline.renderer = function (name) {
	return function (state) {
		return h(name+'.quadcopter-outline', {
			style: { transform: 'rotate(' + state.rotation + 'deg)' }
		}, state.svg);
	};
};

Outline.Top = function (quad) {
	return Outline(quad, 'assets/quadcopter-top.svg', [0, 1, 2, 3]);
};

Outline.Top.render = Outline.renderer('#quadcopter-outline-top');

Outline.Front = function (quad) {
	return Outline(quad, 'assets/quadcopter-side.svg', [0, 2], 'x');
};

Outline.Front.render = Outline.renderer('#quadcopter-outline-front.quadcopter-outline-side');

Outline.Right = function (quad) {
	return Outline(quad, 'assets/quadcopter-side.svg', [1, 3], 'y');
};

Outline.Right.render = Outline.renderer('#quadcopter-outline-right.quadcopter-outline-side');

module.exports = {
	Top: Outline.Top,
	Front: Outline.Front,
	Right: Outline.Right
};
