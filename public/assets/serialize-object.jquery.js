$.fn.serializeObject = function () {
	var arr = this.serializeArray();
	var obj = {};

	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		obj[item.name] = item.value;
	}

	return obj;
};
