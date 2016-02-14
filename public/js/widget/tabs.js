'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function Tabs(tabs, active) {
	var state = hg.state({
		tabs: hg.array(tabs || []),
		active: hg.value(active || 0),
		channels: {
			select: select
		}
	});

	return state;
}

function select(state, data) {
	state.active.set(data.item);
}

Tabs.render = function (state) {
	return h('ul.nav.nav-tabs.nav-justified', state.tabs.map(function (title, i) {
		return h('li' + ((i == state.active) ? '.active' : ''), [
			h('a', {
				href: '#',
				'ev-click': hg.sendClick(state.channels.select, { item: i }, { preventDefault: true })
			}, title)
		]);
	}));
};

Tabs.renderContainer = function (state, name, children) {
	var visible = (state.active === name || state.tabs[state.active] === name);

	return h('div', {
		style: { display: (visible) ? 'block' : 'none' }
	}, children);
};

module.exports = Tabs;
