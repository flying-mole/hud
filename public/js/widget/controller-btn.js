'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function ControllerBtn(quad) {
  var state = hg.state({
    value: hg.value(null),
    updaters: hg.array([]),
    channels: {
      change: change
    }
  });

  hg.watch(state.value, function (val) {
    if (!val || !quad.config) return;
    quad.config.controller.updater = val;
		//quad.cmd.send('config', quad.config);
  });

  quad.on('features', function (data) {
    state.updaters.set(data.updaters);
  });

  return state;
}

function change(state, value) {
  state.value.set(value.controller);
}

ControllerBtn.render = function (state) {
  return h('div.form-inline', [
    h('label.control-label', { htmlFor: 'controller-btn' }, 'Controller:'),
    h('select#controller-btn.form-control', {
      name: 'controller',
      'ev-event': hg.sendChange(state.channels.change)
    }, state.updaters.map(function (name) {
      return h('option', name);
    }))
  ]);
};

module.exports = ControllerBtn;
