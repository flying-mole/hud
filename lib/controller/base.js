'use strict';

class BaseUpdater {
	constructor(quad) {
		this.quad = quad;

		// Updater's config
		var that = this;
		var updateConfig = function () {
			that.config = quad.config.updaters[that.name];
		};

		quad.on('config', updateConfig);
		updateConfig();
	}

	get name() {
		return null;
	}

	setTarget(target) {}
	reset() {}
	update(data) {}
}

module.exports = BaseUpdater;
