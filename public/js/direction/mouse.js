'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var roundTo = require('round-to');
var sendDrag = require('../event/drag');
var AttributeHook = require('../hook/attribute');

var WIDTH = 300, HEIGHT = 300;
var HANDLE_WIDTH = 16, HANDLE_HEIGHT = 16;

var center = {
	x: WIDTH/2 - HANDLE_WIDTH,
	y: HEIGHT/2 - HANDLE_HEIGHT
};

function MouseDirection() {
	return hg.state({
		x: hg.value(0),
		y: hg.value(0),
		z: hg.value(0),
		range: hg.value(90),
		channels: {
			moveHandle: moveHandle,
			changeRange: changeRange,
			changeRotation: changeRotation
		}
	});
}

function moveHandle(state, data) {
	var x = 0, y = 0;
	if (data.down) {
		x = (data.x - WIDTH/2) / (WIDTH/2);
		y = (data.y - HEIGHT/2) / (HEIGHT/2);
	}

	var dist = Math.sqrt(x*x + y*y);
	if (dist > 1) {
		return;
	}

	var range = state.range();
	state.x.set(x * range);
	state.y.set(y * range);
}

function changeRange(state, data) {
	state.range.set(parseFloat(data.range));
}

function changeRotation(state, data) {
	state.z.set(parseFloat(data.rotation));
}

MouseDirection.render = function (state) {
	var x = center.x + state.x/state.range*WIDTH/2;
	var y = center.y + state.y/state.range*HEIGHT/2;

	return h('.row', [
		h('.col-sm-9', [
			h('.direction-mouse', {
				'ev-mousedown': sendDrag(state.channels.moveHandle)
			}, [
				h('.handle' + ((state.x !== 0 || state.y !== 0) ? '.active' : ''), {
					style: { left: x + 'px', top: y + 'px' }
				}, [
					h('.tooltip.top', [
						h('.tooltip-arrow'),
						h('.tooltip-inner', roundTo(state.x, 2) + ', ' + roundTo(state.y, 2))
					])
				])
			]),
			h('.form-inline', [
				h('label.control-label', { htmlFor: 'direction-mouse-range-input' }, 'Range:'),
				h('input#direction-mouse-range-input.form-control', {
					type: 'number',
					name: 'range',
					'ev-event': hg.sendChange(state.channels.changeRange),
					value: state.range
				}),
				' °'
			])
		]),
		h('.col-sm-3', [
			h('span', 'Rotation'),
			h('input', {
				type: 'range',
				name: 'rotation',
				value: state.z,
				min: -90,
				max: 90,
				step: 5,
				orient: AttributeHook('vertical'),
				'ev-event': hg.sendChange(state.channels.changeRotation)
			})
		])
	]);
};

module.exports = MouseDirection;
