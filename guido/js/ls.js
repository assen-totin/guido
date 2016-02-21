/**
 * GUIdo Local Storage functions.
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
 * Set a key:value pair in the Local Storage of the browser.
 * @param key String The key to use
 * @param value String The value to store
 */
function guidoLsSet(key, value) {
	if(typeof(Storage) !== "undefined")
		localStorage.setItem(guidoConf.ls + "_" + key, value);
}


/**
 * Get a value by its key from the Local Storage of the browser.
 * @param key String The key to use
 */
function guidoLsGet(key) {
	if(typeof(Storage) !== "undefined") 
		return localStorage.getItem(guidoConf.ls + "_" + key);
	return null;
}


/**
 * Save current state (appRun object) in the Local Storage of the browser.
 */
function guidoLsSave() {
	if(typeof(Storage) !== "undefined") {
		var newState = {};
		guidoDeepCopyObject(appRun, newState, true);
		localStorage.setItem(guidoConf.ls + "__state", JSON.stringify(newState));
	}
}


/**
 * Load state (appRun object) from the Local Storage of the browser.
 */
function guidoLsLoad(key, value) {
	var restore = true;

	if(typeof(Storage) !== "undefined") {
		var state = localStorage.getItem(guidoConf.ls + "__state");
		if (state) {
			var savedState = JSON.parse(state);

			// Only restore the runtime object if the value of the supplied key inside it matches the supplied value			
			if (key) {
				if (typeof key === "object" && key.constructor == Object)
					restore = guidoCheckProperty(key, savedState);
				else {
					if (savedState[key] == value)
						restore = true;
				}
			}

			if (restore)
				guidoDeepCopyObject(savedState, appRun, true);
		}
	}
}

/**
 * Clear state (appRun object) from the Local Storage of the browser.
 */
function guidoLsClear() {
	if(typeof(Storage) !== "undefined") {
		var state = localStorage.removeItem(guidoConf.ls + "__state");
	}
}

