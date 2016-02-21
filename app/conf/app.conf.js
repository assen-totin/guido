/**
 * Custom (app) condiguration file.
 * 
 */

// Do not rename this variable!
var appConf = {
	// Put whatever you need here, e.g., the URL to your API etc.

/*
	// Example version string. See /app/js/app.js on how to auto-detect version change and act upon it.
	version: 1.0,
*/

/*	
	// Example API configuration. See /app/js/app.js on how its used at runtime
	api: {
		// Leave any of the below entries empty to resue values from browser's URL
		protocol: '',
		host: '',
		port: 12345,
	},
*/

	// Spinner properties for modal dialogues
	spinner: {
		// Minimal showing time in milliseconds
		minShowTime: 1000,
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = appConf;

