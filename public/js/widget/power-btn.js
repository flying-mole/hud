'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function PowerBtn(quad) {
  var state = hg.state({
    value: hg.value(false),
    channels: {
      change: change
    }
  });

  hg.watch(state.value, function (val) {
    if (quad.enabled == val) return;
    quad.cmd.send('enable', val);
  });

  quad.on('enabled', function (val) {
		state.value.set(val);
	});

  return state;
}

function change(state, value) {
  state.value.set(value.enabled);
}

PowerBtn.render = function (state) {
  return h('div', { title: 'Alt+S to start/stop, Esc to stop' }, [
    h('div.switch', [
      h('input', {
        type: 'checkbox',
        id: 'power-switch',
        name: 'enabled',
        checked: state.value,
        'ev-event': hg.sendChange(state.channels.change)
      }),
      h('label', { htmlFor: 'power-switch' })
    ]),
    h('label', { htmlFor: 'power-switch' }, 'POWER')
  ]);
};

module.exports = PowerBtn;
