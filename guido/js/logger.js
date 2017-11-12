/**
 * Logger library.
 * 
 * @author Assen Totin assen.totin@gmail.com
 * 
 * Created for the GUIdo project, copyright (C) 2014 Assen Totin, assen.totin@gmail.com 
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

function guidoLogger(params) {
	var fs = null;
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
		fs = require('fs');

	// Define log levels
	this.LOG_LEVEL_NONE = 0;
	this.LOG_LEVEL_CRITICAL = 1;	// Also known as LOG_LEVEL_FATAL
	this.LOG_LEVEL_ERROR = 2;
	this.LOG_LEVEL_WARNING = 3;
	this.LOG_LEVEL_NOTICE = 4;	// Also known as LOG_LEVEL_INFO
	this.LOG_LEVEL_TRACE = 5;
	this.LOG_LEVEL_DEBUG = 6;

	// For use with the date-formatting function
	this.space = " ";
	this.colon = ":";
	this.weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	this.monthname = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	// Default log level
	this.log_level = params.log_level || this.LOG_LEVEL_NOTICE;
	
	// Logging prefix
	this.app_name = params.app_name || "UNSPECIFIED SERVICE";

	// HTTP log file location
	this.http_log = params.http_log || "/tmp/http.log";

	this.format_date = function() {
		var d = new Date();
		var monthday = (d.getDate().toString().length == 2 ? d.getDate() : "0" + d.getDate());
		var hrs = (d.getHours().toString().length == 2 ? d.getHours() : "0" + d.getHours());
		var mins = (d.getMinutes().toString().length == 2 ? d.getMinutes() : "0" + d.getMinutes());
		var secs = (d.getSeconds().toString().length == 2 ? d.getSeconds() : "0" + d.getSeconds());
	
		return "[" + this.weekday[d.getDay()] + this.space + 
			this.monthname[d.getMonth()] + this.space + 
			monthday + this.space + 
			hrs + this.colon + mins + this.colon + secs + this.space + 
			d.getFullYear() + "]";
	};
	
	this.critical = function(message) {
		this.output(message, this.LOG_LEVEL_CRITICAL, 'CRITICAL');
	};
	
	this.error = function(message) {
		this.output(message, this.LOG_LEVEL_ERROR, 'ERROR');
	};
	
	this.warning = function(message) {
		this.output(message, this.LOG_LEVEL_WARNING, 'WARNING');
	};
	
	this.notice = function(message) {
		this.output(message, this.LOG_LEVEL_NOTICE, 'NOTICE');
	};
	
	this.trace = function(message) {
		this.output(message, this.LOG_LEVEL_TRACE, 'TRACE');
	};
	
	this.debug = function(message) {
		this.output(message, this.LOG_LEVEL_DEBUG, 'DEBUG');
	};
	
	this.output = function(message, log_level, log_prefix) {
		if (this.log_level == this.LOG_LEVEL_NONE)
			return;
		
		if (log_level > this.log_level)
			return;
		
		var tstamp = this.format_date();
		
		var err_msg = tstamp + '[' + log_prefix + '][' + this.app_name + ']' + message;
		
		if (log_level <= this.LOG_LEVEL_ERROR) {
			// ERROR and CRITICAL messages go to both logs
			console.error(err_msg);
			console.log(err_msg);
		}
		
		else
			// All other messages go to output log only
			console.log(err_msg);
	};

	this.http = function(message) {
		// Protect from non-nodeJS usage
		if (! fs)
			return;

		var tstamp = this.format_date();

		var msg = tstamp + '[' + this.app_name + ']' + message + "\n";

		var self = this;

		fs.appendFile(self.http_log, msg, function (error) {
			if (error)
				self.critical("Unable to write to HTTP log file " + self.http_log);
		});
	};
};


if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = guidoLogger;

