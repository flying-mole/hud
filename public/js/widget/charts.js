'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var smoothie = require('smoothie');
var StreamingChart = require('./streaming-chart');

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

function initChart(chart, names) {
  var items = {};

  var nextStyle = lineStyleGenerator();
  names.forEach(function (name) {
    var item = new smoothie.TimeSeries();
    chart.chart.addTimeSeries(item, nextStyle());
    items[name] = item;
  });

  return items;
}

function Charts(quad) {
  var charts = {
    gyro: StreamingChart(),
    accel: StreamingChart(),
    rotation: StreamingChart(),
    motorsSpeed: StreamingChart()
  };

  var gyro = initChart(charts.gyro, ['x', 'y', 'z']);
  var accel = initChart(charts.accel, ['x', 'y', 'z']);
  var rotation = initChart(charts.rotation, ['x', 'y', 'z']);
  var motorsSpeed = initChart(charts.motorsSpeed, [0, 1, 2, 3]);

  var state = hg.state({
    charts: hg.struct(charts),
    visibleAxes: hg.array(['x', 'y', 'z']),
    channels: {
      changeVisibleAxes: changeVisibleAxes
    }
  });

  function append(series, t, data) {
    for (var name in data) {
      series[name].append(t, data[name]);
    }
  }

  function filter(data, axes) {
    var filtered = {};
    for (var i = 0; i < axes.length; i++) {
      var axis = axes[i];
      filtered[axis] = data[axis];
    }
    return filtered;
  }

  quad.on('orientation', function (data) {
    var t = new Date().getTime();
    var axes = state.visibleAxes();

    append(gyro, t, filter(data.gyro, axes));
    append(accel, t, filter(data.accel, axes));
    append(rotation, t, filter(data.rotation, axes));
  });

  quad.on('motors-speed', function (data) {
    var t = new Date().getTime();
    append(motorsSpeed, t, data);
  });

  return state;
}

function changeVisibleAxes(state, data) {
  var axes = data.axes.split(',').map(function (axis) {
    return axis.trim();
  });

  state.visibleAxes.set(axes);
}

Charts.render = function (state) {
  return h('.container-fluid', h('.row', [
    h('.col-lg-4.col-xs-12.graph-ctn', [
      h('strong', 'Gyro'),
      state.charts.gyro
    ]),
    h('.col-lg-4.col-xs-12.graph-ctn', [
      h('strong', 'Accel'),
      state.charts.accel
    ]),
    h('.col-lg-4.col-xs-12.graph-ctn', [
      h('strong', 'Rotation'),
      state.charts.rotation
    ]),
    h('.col-lg-4.col-xs-12.graph-ctn', [
      h('strong', 'Motors speed'),
      state.charts.motorsSpeed
    ]),
    h('.col-lg-4.col-xs-12', [
      h('strong', 'Graphs settings'),
      h('.form-inline', [
        h('label', { htmlFor: 'chart-axes-btn' }, 'Show axes:'),
        h('select#chart-axes-btn.form-control', {
          name: 'axes',
          'ev-event': hg.sendChange(state.channels.changeVisibleAxes)
        }, [
          h('option', 'x, y, z'),
          h('option', 'x'),
          h('option', 'y'),
          h('option', 'z')
        ])
      ])
    ])
  ]));
};

module.exports = Charts;
