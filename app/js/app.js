/**
 * Custom application library.
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

// Runtime global object for anything you may need  
var appRun = {};

// Get your custom logger
appRun.logger = new guidoLogger({app_name: 'App'});
appRun.logger.log_level = guidoRun.logger.log_level;

// Create a place for the spinner
appRun.spinner = {};

// Example how to make API location code as independent as possible (see /app/conf/app.conf for the config entry)
// Use appConf.api.url in your functions as base for your API
/*
var tmpProtocol = appConf.api.protocol || document.location.protocol;
var tmpHost = appConf.api.host || document.location.hostname;
var tmpPort = appConf.api.port || document.location.port;
if (!tmpPort) 
	tmpPort = (tmpProtocol == 'https:') ? 443 : 80;
appConf.api.url = tmpProtocol + '//' + tmpHost + ':' + tmpPort;
*/

/*
// Example how to detect version change and act upon it.
// Copy the current version from appConf to AppRun, which will be saved in the Local Storage between sessions.
// See per-layout functions on how to load the saved object conditionally.
var checkVersion = {
	versions : {
		app: appConf.version
	}
};
*/

// Main app function

/**
 * Main app function.
 * Executed when guidoMain() completes.  
 */
function appMain() {
	appRun.logger.debug('Entering function appMain()...');
	// Add your code below
}

// Per-layout loading and unloading functions

/**
 * Per-layout loading method. 
 * Will be called whenever layout named 'first' is loaded.
 */
function appLoadLayout_first() {
	appRun.logger.debug('Entering function appLoadLayout_first()...');
	// Add your code below

/*
	// Example how to load the runtime object from Local Storge conditionally: 
	// the object will be loaded only if the version of the current app is the same as the version that was saved.
	// If the saved appRun is restored and it has a session, the user will be considered logged-in.
	// If the saved appRun is not restored, the current appRun object will not have a session and you can ask the user to log in. 
	// Thus you can ensure that the user always has required objects and properties once the app version changes.
	// You probably want this code in every layout loading method. 
	guidoLsLoad(checkVersion);
*/
}


/**
 * Per-layout unloading method. 
 * Will be called whenever layout named 'first' is unloaded.
 */
function appUnloadLayout_first() {
	appRun.logger.debug('Entering function appUnloadLayout_first()...');
	// Add your code below
}

/**
 * Per-layout loading method. 
 * Will be called whenever layout named 'first' is loaded.
 */
function appLoadLayout_second() {
	appRun.logger.debug('Entering function appLoadLayout_second()...');
	// Add your code below
}

/**
 * Per-layout unloading method. 
 * Will be called whenever layout named 'second' is unloaded.
 */
function appUnloadLayout_second() {
	appRun.logger.debug('Entering function appUnloadLayout_second()...');
	// Add your code below
}

// Per-section loading and unloading functions

/**
 * Per-section loading method. 
 * Will be called whenever section named 'example1' is loaded.
 */
function appLoadSection_example1() {
	appRun.logger.debug('Entering function appLoadSection_example1()...');
	// Add your code below
}


/**
 * Per-section unloading method. 
 * Will be called whenever section named 'example1' is unloaded.
 */
function appUnloadSection_example1() {
	appRun.logger.debug('Entering function appUnloadSection_example1()...');
	// Add your code below
}


/**
 * Per-section loading method. 
 * Will be called whenever section named 'example2' is loaded.
 */
function appLoadSection_example2() {
	appRun.logger.debug('Entering function appLoadSection_example2()...');
	// Add your code below
}


/**
 * Per-section unloading method. 
 * Will be called whenever section named 'example2' is unloaded.
 */
function appUnloadSection_example2() {
	appRun.logger.debug('Entering function appUnloadSection_example2()...');
	// Add your code below
}


/**
 * Per-section loading method. 
 * Will be called whenever section named 'example3' is loaded.
 */
function appLoadSection_example3() {
	appRun.logger.debug('Entering function appLoadSection_example3()...');
	// Add your code below
}


/**
 * Per-section unloading method. 
 * Will be called whenever section named 'example3' is unloaded.
 */
function appUnloadSection_example3() {
	appRun.logger.debug('Entering function appUnloadSection_example3()...');
	// Add your code below
}

/**
 * Per-section loading method. 
 * Will be called whenever section named 'example4' is loaded.
 */
function appLoadSection_example4() {
	appRun.logger.debug('Entering function appLoadSection_example4()...');
	// Add your code below
}


/**
 * Per-section unloading method. 
 * Will be called whenever section named 'example4' is unloaded.
 */
function appUnloadSection_example4() {
	appRun.logger.debug('Entering function appUnloadSection_example4()...');
	// Add your code below
}


// Per-template loading and unloading functions are in separate files, in /js directory

