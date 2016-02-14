'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var sendDrag = require('../event/drag');

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
    channels: {
      moveHandle: moveHandle
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

  state.x.set(x);
  state.y.set(y);
}

MouseDirection.render = function (state) {
  var x = center.x + state.x*WIDTH/2;
  var y = center.y + state.y*HEIGHT/2;

  return h('.direction-mouse', {
    'ev-mousedown': sendDrag(state.channels.moveHandle)
  }, [
    h('.handle', {
      style: { left: x + 'px', top: y + 'px' }
    })
  ]);
};

module.exports = MouseDirection;
