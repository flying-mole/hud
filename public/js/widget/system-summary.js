'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var colors = require('../colors');

function SystemSummary(quad) {
	var state = hg.state({
		loadavg: hg.value([]),
		mem: hg.struct({ free: 0, total: 0 })
	});

	quad.on('os-stats', function (data) {
		state.loadavg.set(data.loadavg);
		state.mem.set(data.mem);
	});

	return state;
}

SystemSummary.render = function (state) {
	function ratioColor(ratio) {
		return colors.toRgb(colors.shade(colors.getForPercentage(1 - ratio), -0.5));
	}

	var memRatio = 0;
	if (state.mem) {
		memRatio = state.mem.free / state.mem.total;
	}

	return h('p', [
		h('span', ['Load average: '].concat(state.loadavg.map(function (avg) {
			var pct = Math.round(avg * 100);
			return h('span', {
				style: { color: ratioColor(avg) }
			}, pct + '% ');
		}))),
		h('br'),
		h('span', [
			'Memory: ',
			h('span', {
				style: { color: ratioColor(memRatio) }
			}, state.mem.free + '/' + state.mem.total + ' ('+Math.round(memRatio * 100)+'%)')
		])
	]);
};

module.exports = SystemSummary;
