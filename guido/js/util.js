/**
 * GUIdo utility functions.
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

/**
 * Set location in browser without page refresh
 * @param url String The local part of the URL to set.
 * @param title String The title show and to save in the history object
 */
function guidoSetLocation(url, title) {
	var path = (guidoConf.path) ?  guidoConf.path : '';

	// Here {} is just a placeholder for the object which can be associated with the state 
	window.history.replaceState({}, title, path + url);
	document.title = title;
}


/**
 * Compose a page title
 * @param title String The text to append to the app's name 
 * @returns String The composed title 
 */
function guidoComposeTitle(title) {
	if (title)
		return guidoConf.title + " :: " + title;
	
	return guidoConf.title + " :: " + guidoConf.layouts[guidoRun.current_layout][guidoRun.current_section].title;
}


/**
 * Helper function to decide whether this line should be skipped (i.e. is a comment or empty) or not.
 * @param line String The line to be considered.
 * @returns boolean TRUE of the line should be skipped, FALSE otherwise. 
 */
function guidoSkipLine(line) {
	// Skip empty lines 
	if (line.length < 1)
		return true;

	// Skip comments
	if (line.indexOf("#") == 0)
        	return true;

	// Skip comments
	if (line.indexOf("//") == 0)
        	return true;

	return false;
}


/**
 * Helper function to read cookie's content by its name
 * @param name String Cookie's name
 * @returns String Cookie's value or empty on missing cookie.
 */
function guidoGetCookie(name) {
	var name = name + "=";
	var ca = document.cookie.split(';');
	for (var i=0; i<ca.length; i++) {
		var c = ca[i].trim();
		if (c.indexOf(name) == 0) 
			return c.substring(name.length,c.length);
	}
	return "";
} 


/**
 * Helper function to delete a cookie's by its name
 * @param cname String Cookie's name
 */
function guidoDelCookie(name) {
	// Apache sets the cookie with path=/ and domain=.domain.com - which both need to be specified in order to delete the cookie. 
	document.cookie = name + "=;domain=." + location.host + ";expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
	// Nginx sets the cookie with path=/ and domain=domain.com - which both need to be specified in order to delete the cookie. 
	document.cookie = name + "=;domain=" + location.host + ";expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
}

/**
 * Helper function to retrieve layout and section names from REQUEST_URI
 * @param location The original REQUEST_URI as received via the guido_f5 cookie.
 * @returns {Array} An array of strings, consisting ot two elements: layout and section. 
 */

function guidoGetLayoutAndSection(location) {
	var layout = null;
	var section = null;

	// Remove any path if such is specified inc onfig
	var updated = location.replace(guidoConf.path, '');
	
	if ((updated !== null) || (updated.length > 2)) {
		var parts = updated.split("/");

		// Is parts[1] a valid layout?
		if ((typeof parts[1] !== 'undefined') && (typeof guidoConf.layouts[parts[1]] !== 'undefined'))
			layout = parts[1];

		// Is parts[2] a valid section?
		if (layout && (typeof parts[2] !== 'undefined') && (typeof guidoConf.layouts[layout][parts[2]] !== 'undefined'))
			section = parts[2];
	}
	return [layout, section];
}


/**
 * Helper function to get a random number between MIN and MAX
 * @returns {Number} Random number between MIN and MAX
 */
function guidoGetRandom() {
	// Make sure we always have 4 digits
	var min = 1000;
	var max = 8999;
	return "mount" + parseInt((Math.random() * max) + min);
}


/**
 * Helper function to trim quotes from the beginning and ending of a string.
 * @param s String The string to trim.
 * @returns String The trimmed string. 
 */
function guidoTrimQuotes(s) {
	return s.replace(/^'|^"|'$|"$/g,'');
}


/**
 * Helper function to trim \n from the ending of a string.
 * @param s String The string to trim.
 * @returns String The trimmed string. 
 */
function guidoTrimN(s) {
	return s.replace(/\\n/,'');
}


/**
 * Helper method to get file's extension
 * @param filename String The filename to process
 * @returns String The filename's extension.
 */
function guidoGetFileExtension (filename) {
	return (/[.]/.exec(filename)) && /[^.]+$/.exec(filename)[0] || '';
};


/**
 * Helper method to get MIME type based on file's extension
 * @param extension String The filename's extension
 * @returns String The MIME type which corresponds to the specified extension.
 */
function guidoGetMimeType(extension) {
	switch(extension.toLowerCase()) {
	case 'png': return 'image/png';
	case 'gif': return 'image/gif';
	case 'jpg':
	case 'jpeg': return 'image/jpeg';
	case 'svg': return 'image/svg+xml';
	}
	
}

/**
 * Deep-copy an object
 * @param source Object The object to copy
 * @param destination Object An empty object where the copy will be made
 * @param skipFunctions Boolean Set to TRUE to skip functions when copying (good for serailisation)
 */
function guidoDeepCopyObject(source, destination, skipFunctions) {
	for (var property in source) {
		if (typeof source[property] === "object" && source[property] !== null ) {
			if(source[property].constructor == Array){
				destination[property] = [];
				for (var i=0; i<source[property].length; i++)
					destination[property].push(source[property][i]);
			}
			else if(source[property].constructor == Object){
				destination[property] = {};
				guidoDeepCopyObject(source[property], destination[property]);
			}
		}
		else if (skipFunctions && (typeof source[property] === "function"))
			;
		else
			destination[property] = source[property];
	}
	return destination;
};

/**
 * Check if an object contains another
 * @param needle Object The object to check for
 * @param haystack Object The object to check into
 */
function guidoCheckProperty(needle, haystack) {
	var ret = [];

	for (var property in needle) {
		if (typeof needle[property] === "object" && needle[property].constructor == Object) {
			if (haystack.hasOwnProperty(property))
				ret.push(guidoCheckProperty(needle[property], haystack[property]));
			else
				return false;
		}
		else if (typeof needle[property] === "function")
			// Skip functions
			;
		else {
			if (haystack[property] == needle[property]) 
				ret.push(true);
			else
				return false;
		}
	}

	for (var i=0; i<ret.length; i++) {
		if (! ret[i])
			return false;
	}

	return true;
};

/**
 * Sort an array of objects by one of the object's properties.
 * @param array Array The array to sort
 * @param property String The property name by which value to sort
 * @param direction String Sorting direction, 'asc' or 'desc'
 * @param comparator Function Custom sorting function for non-numeric and non-lexical sorting
 */
function guidoSortObjects(array, property, direction, comparator) {
	if (!array)
		return;

	if (array.constructor != Array)
		return;

	if (! direction)
		direction = 'asc';

	// See if we need numeric or lexical sort
	// If comparator is given, always use it
	var method;
	if (comparator)
		method = 'custom';
	else {
		method = 'int';
		for (var i=0; i<array.length; i++) {
			if (array[i] !== parseInt(array[i], 10)) {
				method = 'str';
				break;
			}
		}
	}

	var tmp;
	var cmp;
	for (var i=0; i<(array.length - 1); i++) {
		for (var j=0; j<(array.length - 1); j++) {
			switch(method) {
				case 'str':
					cmp = array[j][property].localeCompare(array[j+1][property]);
					break;
				case 'int':
					if (array[j][property] == array[j+1][property])
						cmp = 0;
					else 
						cmp = (array[j][property] > array[j+1][property]) ? 1 : -1;
					break;
				case 'custom':
					cmp = comparator(array[j][property], array[j+1][property]);
					break;
			}

			if ( ((direction == 'asc') && (cmp > 0)) || ((direction == 'desc') && (cmp < 0)) ){
				tmp = array[j];
				array[j] = array[j+1];
				array[j+1] = tmp;
			}
		}
	}
};

/**
 * Convert an ArrayBuffer to UTF-8 string.
 * @param arrayBuffer ArrayBuffer The ArrayBuffer to convert
 * @returns String The converted string as UTF-8
 */
function guidoAbToUtf8(arrayBuffer) {
	// Chrome & Fox support HTML5's TextDecoder, so use it
	if ('TextDecoder' in window)
		return new TextDecoder('utf-8').decode(arrayBuffer);

	// For WebKit and MSIE, decode manually
	var result = "";
	var i = 0;
	var c = 0;
	var c1 = 0;
	var c2 = 0;

	var data = new Uint8Array(arrayBuffer);

	// If we have a BOM skip it
	if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf)
    	i = 3;

	while (i < data.length) {
		c = data[i];

		if (c < 128) {
			result += String.fromCharCode(c);
			i++;
		} 
		else if (c > 191 && c < 224) {
			if( i+1 >= data.length )
				throw "UTF-8 Decode failed. Two byte character was truncated.";

			c2 = data[i+1];
			result += String.fromCharCode( ((c&31)<<6) | (c2&63) );
			i += 2;
	    } 
		else {
			if (i+2 >= data.length)
				throw "UTF-8 Decode failed. Multi byte character was truncated.";

			c2 = data[i+1];
			c3 = data[i+2];
			result += String.fromCharCode( ((c&15)<<12) | ((c2&63)<<6) | (c3&63) );
			i += 3;
		}
	}

	return result;
};

/**
 * Sort a table (global function for tables)
 * @param tableId String The ID of the table to sort
 * @param columnId Integer The ID of the column to sort (leftmost is 0)
 * @param direction String The directoin of sort, either 'asc' or 'desc'
 */
function guidoTableSort(tableId, columnId, direction) {
	appRun.tables[tableId].sort = columnId;
	appRun.tables[tableId].direction = direction;
	// Reset pagination
	appRun.tables[tableId].currentPage = 1;

	appRun.tables[tableId].render();
};

/**
 * Go to table page (global function for tables)
 * @param tableId String The ID of the table to sort
 * @param page The page to go to
 */

function guidoTablePage(tableId, page) {
	appRun.tables[tableId].currentPage = page;

	appRun.tables[tableId].render();
};

/**
 * Extract File object from file form field (global function for forms)
 * @param event Event The file changed event
 */
function guidoFormGetFile(event) {
	// Save the whole event so that we may use it later to upload the file
	var keys = Object.keys(appRun.forms[event.target.form.id].fields);
	for (var i=0; i<keys.length; i++) {
		if (appRun.forms[event.target.form.id].fields[keys[i]].attributes.id == event.target.id) {
			appRun.forms[event.target.form.id].fields[keys[i]].eventChangeFile = event;
			break;
		}
	}
};

