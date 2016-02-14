'use strict';

function AttributeHook(value) {
	if (!(this instanceof AttributeHook)) {
		return new AttributeHook(value);
	}

	this.value = value
}

AttributeHook.prototype.hook = function (elem, prop) {
	elem.setAttribute(prop, this.value)
}

module.exports = AttributeHook;
