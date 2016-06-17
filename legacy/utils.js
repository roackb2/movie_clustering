
module.exports = {
	getElpasedTime: function(start, end) {
		var diff = end.getTime() - start.getTime();
		var secMill = 1000;
		var minMill = secMill * 60;
		var hourMill = minMill * 60;
		var dayMill = hourMill * 24;

		var days = Math.floor(diff / dayMill);
		var hours = Math.floor(diff / hourMill) % 24;
		var mins = Math.floor(diff / minMill) %  60;
		var secs = Math.floor(diff / secMill) % 60;
		var result = "";
		if(days >= 1) {
			result += days + " days, ";
		}
		if(hours >= 1) {
			result += hours + " hours, ";
		}
		if(mins >= 1) {
			result += mins + " mins, ";
		}
		if(secs >= 1) {
			result += secs + " secs";
		}
		return result;
	}
}