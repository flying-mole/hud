'use strict';

var hg = require('mercury');
var extend = require('extend');

module.exports = hg.BaseEvent(function (ev, broadcast) {
  var data = this.data;
  var delegator = hg.Delegator();

  var offset = ev.target.getBoundingClientRect();

  function onmove(ev) {
    broadcast(extend(data, {
      down: true,
      x: ev.clientX - offset.left,
      y: ev.clientY - offset.top
    }));
  }

  function onup(ev) {
    delegator.unlistenTo('mousemove');
    delegator.removeGlobalEventListener('mousemove', onmove);
    delegator.removeGlobalEventListener('mouseup', onup);

    broadcast(extend(data, {
      down: false
    }));
  }

  delegator.listenTo('mousemove');
  delegator.addGlobalEventListener('mousemove', onmove);
  delegator.addGlobalEventListener('mouseup', onup);
});
