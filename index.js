var Quadcopter = require('./lib/quadcopter');
var config = require('./config');

var quad = new Quadcopter(config);
quad.start();