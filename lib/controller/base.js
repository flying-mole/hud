'use strict';

class BaseUpdater {
	constructor(quad) {
		this.quad = quad;
	}

	setTarget(target) {}
	reset() {}
	update(data) {}
}

module.exports = BaseUpdater;
