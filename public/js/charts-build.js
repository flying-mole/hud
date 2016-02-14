'use strict';

var smoothie = require('smoothie');
var StreamingChart = require('./widget/streaming-chart');

var lineStyle = {
  red: { strokeStyle: 'rgb(255, 0, 0)' },
	green: { strokeStyle: 'rgb(0, 255, 0)' },
	blue: { strokeStyle: 'rgb(0, 0, 255)' },
	yellow: { strokeStyle: 'yellow' }
};

function lineStyleGenerator() {
  var styles = Object.keys(lineStyle);

  var i = 0;
  return function () {
    return lineStyle[styles[i++]];
  };
}

module.exports = function (quad) {
  var charts = {
    gyro: StreamingChart(),
    accel: StreamingChart()
  };

  // Gyro
  var gyro = {
    x: new smoothie.TimeSeries(),
    y: new smoothie.TimeSeries(),
    z: new smoothie.TimeSeries()
  };

  var nextStyle = lineStyleGenerator();
  for (var axis in gyro) {
    charts.gyro.chart.addTimeSeries(gyro[axis], nextStyle());
  }

  // Accel
  var accel = {
    x: new smoothie.TimeSeries(),
    y: new smoothie.TimeSeries(),
    z: new smoothie.TimeSeries()
  };

  var nextStyle = lineStyleGenerator();
  for (var axis in accel) {
    charts.accel.chart.addTimeSeries(accel[axis], nextStyle());
  }

  // Listen for events

  function append(series, t, data) {
    for (var name in data) {
      series[name].append(t, data[name]);
    }
  }

  quad.on('orientation', function (data) {
    var t = new Date().getTime();

    append(gyro, t, data.gyro);
    append(accel, t, data.accel);
  });

  return charts;
};
