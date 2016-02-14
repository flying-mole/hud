'use strict';

var document = require('global/document');
var hg = require('mercury');
var h = require('mercury').h;
var smoothie = require('smoothie');

var chartStyle = {
  grid: {
    fillStyle: 'transparent',
    borderVisible: false
  }
};

function StreamingChart() {
  if (!(this instanceof StreamingChart)) {
    return new StreamingChart();
  }

  this.chart = new smoothie.SmoothieChart(chartStyle);
}

StreamingChart.prototype.type = 'Widget';

StreamingChart.prototype.init = function () {
  var canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;

  this.chart.streamTo(canvas);

  return canvas;
};

StreamingChart.prototype.update = function (prev, elem) {};

module.exports = StreamingChart;
