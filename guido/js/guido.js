/**
 * Main GUIdo library.
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

// Global runtime object
var guidoRun = {};

// Init logger
guidoRun.logger = new guidoLogger({log_level: guidoConf.log_level, app_name: 'Guido'});

// Init templates storage
guidoRun.templates = {};

// Init images storage
guidoRun.images = {};

// Init fonts storage
guidoRun.fonts = {};

// Init current layout and section name
guidoRun.current_layout = guidoConf.layout;
guidoRun.current_section = guidoConf.section;

// Init locale
guidoRun.locale = guidoConf.locale;
guidoRun.gettext = null;
guidoRun.locales = {};
guidoRun.po = {};

/**
 * Main entry point
 * Will be invoked once on application's load.
 * @param cb function Callback to be invoked.
 */
function guidoMain() {
	guidoRun.logger.debug('Entering function guidoMain()...');
	
	// Init the back/forward navigation detection (browser buttons)
	window.onpopstate = function(e){
	    if(e.state){
		// TODO: decide what to do here
		//document.getElementById("content").innerHTML = e.state.html;
		//document.title = e.state.pageTitle;
	    	alert("Some button pressed!");
	    }
	};

	// Add the _root template of the layout to the list of templates for each section
	for (var layout in guidoConf.layouts) {
		for (var section in guidoConf.layouts[layout]) {
			if (guidoConf.layouts[layout][section].templates) 
				guidoConf.layouts[layout][section].templates.push(guidoConf.layouts[layout]._root);
		}
	}
	
	// Load layouts from config into storage, set defaults
	for (var layout in guidoConf.layouts) 
		guidoRun.templates[layout] = {};
	
	// If an F5 cookie was supplied, read and process its value; override defaults
	var f5 = guidoGetLayoutAndSection(guidoGetCookie(guidoConf.cookie_f5));
	if (f5[0] != null) {
		guidoRun.current_layout = f5[0];
		guidoDelCookie(guidoConf.cookie_f5);
		if (f5[1] != null)
			guidoRun.current_section = f5[1];
		else
			guidoRun.current_section = guidoConf.layouts[guidoRun.current_layout]._section;
	}
	
	// Create sync object which will load the default layout and run the APP Main() function
	var sync = new guidoSync(function() {
		// Create sync object to load PO file only when the Gettext object has been loaded
		var sync_gettext = new guidoSync(function() {
			guidoLoadLayout(guidoRun.current_layout, guidoRun.current_section);
			appMain();
		});
		
		// Complete sync'ed load: locale but only when Gettext has loaded
		if (guidoRun.locale.length > 1)
			guidoLoadLocale(guidoRun.locale, sync_gettext, null);
	});
		
	// Use ZIP file or not?
	if (guidoConf.zip) {
		sync.inc();
		
		var xhr = new XMLHttpRequest();
		xhr.open('GET', guidoConf.path + '/guido.zip');
		xhr.responseType = 'arraybuffer';
		xhr.onload = function(e) {
			if (this.status == 200) {
				var i=0;
				var files = undefined;
				var zipfile = new ZipFile(this.response);
						
				// Load Guido vendor JS scripts
				files = zipfile.findFiles('guido/vendor/');
				for (i=0; i<files.length; i++) 
					guidoAttachJs(files[i], zipfile.getFile(files[i]));	

				// Load APP images
				if (guidoConf.preload_images) {
			    	files = zipfile.findFiles('app/images/');
			    	for (i=0; i<files.length; i++) {
						// Use the image file name as a key
						files[i] = files[i].replace(/^app\/images\//, '');
						guidoAttachImage(files[i], zipfile.getFile(files[i]), null);
					}								
				}

				// Load APP locales (PO files)
				files = zipfile.findFiles('app/locale/');
				for (i=0; i<files.length; i++) {
					var file_name = files[i].replace(/^app\/locale\//, '');
					// Use the locale file name as a key
					// We get ArrayBuffer from ZIP, so convert it to string
					guidoAttachLocale(file_name, guidoAbToUtf8(zipfile.getFile(files[i])), null);	
				}
			
				// Load APP JS scripts
				files = zipfile.findFiles('app/js/');
				for (i=0; i<files.length; i++) 
					guidoAttachJs(files[i], zipfile.getFile(files[i]), null);	

				// Load GUIOD fonts
		    	files = zipfile.findFiles('guido/fonts/');
		    	for (i=0; i<files.length; i++) {
					// Use the image file name as a key
					files[i] = files[i].replace(/^guido\/fonts\//, '');
					guidoAttachFont(files[i], zipfile.getFile(files[i]), null);
				}

				// Load APP fonts
		    	files = zipfile.findFiles('app/fonts/');
		    	for (i=0; i<files.length; i++) {
					// Use the image file name as a key
					files[i] = files[i].replace(/^app\/fonts\//, '');
					guidoAttachFont(files[i], zipfile.getFile(files[i]), null);
				}

				// Load APP CSS
				files = zipfile.findFiles('app/css/');
				for (i=0; i<files.length; i++) 
					guidoAttachCss(zipfile.getFile(files[i]), null);

				// Load APP templates
				files = zipfile.findFiles('app/templates/');
				for (i=0; i<files.length; i++) {
	   				var parts = files[i].split("/");
	   				// Use the template's file name as a key
	   				// Note: template names *must* be unique within a layout. 
	   				var layout = parts[2]; 
	   				var key = parts[parts.length - 1].replace(/\.template$/, '');
	   				guidoAttachTemplate(layout, key, zipfile.getFile(files[i]), null);	
				}
			
				sync.dec();
			}
		};

		xhr.send();
	}
	else {			
		// Load synchronised: Guido vendor JS, APP images, JS, CSS, templates, locales
		guidoLoadList('/guido/vendor', 'text', sync, function(file_name, file_data, sync) {
			guidoAttachJs(file_name, file_data, sync);
		});

		if (guidoConf.preload_images)
			guidoLoadList('/app/images', 'binary', sync, function(file_name, file_data, sync) {
				var key = file_name.replace(/^app\/images\//,'');
				// Use the image file name as a key 
				guidoAttachImage(key, file_data, sync);
			});

		guidoLoadList('/app/js', 'text', sync, function(file_name, file_data, sync) {
			guidoAttachJs(file_name, file_data, sync);
		});

		guidoLoadList('/guido/fonts', 'binary', sync, function(file_name, file_data, sync) {
			var key = file_name.replace(/^guido\/fonts\//,'');
			guidoAttachFont(key, file_data, sync);
		});

		guidoLoadList('/app/fonts', 'binary', sync, function(file_name, file_data, sync) {
			var key = file_name.replace(/^app\/fonts\//,'');
			guidoAttachFont(key, file_data, sync);
		});

		guidoLoadList('/app/css', 'text', sync, function(file_name, file_data, sync) {
			guidoAttachCss(file_data, sync);
		});

		guidoLoadList('/app/templates', 'text', sync, function(file_name, file_data, sync) {
			var parts = file_name.split("/");
			// Use the template's file name as a key
			// Note: template names *must* be unique within a layout. 
			var layout = parts[0]; 
			var key = parts[parts.length - 1].replace(/\.template$/, '');
			guidoAttachTemplate(layout, key, file_data, sync);
		});

		guidoLoadList('/app/locale', 'text', sync, function(file_name, file_data, sync) {
			var key = file_name.replace(/^app\/locale\//,'');
			// Use the locale file name as a key 
			guidoAttachLocale(key, file_data, sync);
		});
	}
}


/**
 * Load a layout and switch to the specified section inside it
 * @param layout String The name of the layout.
 * @param section String The name of the section.
 */
function guidoLoadLayout(layout, section) {
	guidoRun.logger.debug('Entering function guidoLoadLayout() with args: ' + layout + ',' + section);

	// Call per-layout APP unloading function
	if (layout !== guidoRun.current_layout) {
		var app_func_unload_layout = 'appUnloadLayout_' + guidoRun.current_layout;
		if (typeof window[app_func_unload_layout] == 'function')
			window[app_func_unload_layout]();
	}
	
	// Call per-section APP unloading function
	if (section !== guidoRun.current_section) {
		var app_func_unload_section = 'appUnloadSection_' + guidoRun.current_section;
		if (typeof window[app_func_unload_section] == 'function') {
			window[app_func_unload_section]();
		}		
	}

	var old_layout = guidoRun.current_layout;
	guidoRun.current_layout = layout;
	guidoRun.current_section = section;

	// Call the unload functions from the old layout
	$(document.body).children("div").each(function(index, element){
		guidoUnloadTemplate(index, element);
	});

	// Set the window title & location
	var title = guidoComposeTitle(null);
	guidoSetLocation('/' + guidoRun.current_layout + '/' + section, title);

	// Call per-layout APP loading function
	var app_func_load_layout = 'appLoadLayout_' + layout;
	if (typeof window[app_func_load_layout] == 'function')
		window[app_func_load_layout]();

	// Call per-section APP loading function
	var app_func_load_section = 'appLoadSection_' + section;
	if (typeof window[app_func_load_section] == 'function')
		window[app_func_load_section]();

	// Remove the old layout
	$(document.body).children("#guido_" + guidoConf.layouts[old_layout]._root).each(function(index, element){
		element.innerHTML = '';
	});

	// Load the templates recursively starting from the BODY tag
	$(document.body).children("#guido_" + guidoConf.layouts[guidoRun.current_layout]._root).each(function(index, element) {
		guidoLoadTemplate(index, element);
	});
}


/**
 * Switch to the specified section within the current layout
 * @param section String The name of the section.
 */
function guidoLoadSection(section) {
	guidoRun.logger.debug('Entering function guidoLoadSection() with args: ' + section);
	
	// Call per-section APP unloading function
	if (section !== guidoRun.current_section) {
		var app_func_unload = 'appUnloadSection_' + guidoRun.current_section;
		if (typeof window[app_func_unload] == 'function') {
			window[app_func_unload]();
		}
	}
	
	guidoRun.current_section = section;
	
	// Set the window title & location
	var title = guidoComposeTitle(null);
	guidoSetLocation('/' + guidoRun.current_layout + '/' + section, title);

	// Unload the templates recursively starting from the BODY tag
	$(document.body).children("div").each(function(index, element){
		guidoUnloadTemplate(index, element);
	});

	// Call per-section APP loading function
	var app_func_load = 'appLoadSection_' + section;
	if (typeof window[app_func_load] == 'function')
		window[app_func_load]();
	
	// Load the templates recursively starting from the BODY tag
	$(document.body).children("div").each(function(index, element){
		guidoLoadTemplate(index, element);
	});
} 


/**
 * Check if the supplied DIV has placeholders where templates need to be attached 
 * @param index int The index of the DIV element.
 * @param element object The DIV element to be processed.
 */
function guidoLoadTemplate(index, element) {
	guidoRun.logger.debug('Entering function guidoLoadTemplate() with args: ' + index + ',' + element.id);
	
	// If the ID does not begin with 'guido_' there's nothing to attach here - return
	if (element.id.substring(0, 6) != 'guido_')
		return;
	
	// If a template is already attached, do not re-attach it
	if (element.id.match(/guido_.*_mount[0-9]{4}$/))
		return;

	// Strip the "guido_" prefix from DIV's ID 
	var match_id = element.id.replace(/^guido_/g, "");

	// Check if we need to attach a template to the supplied DIV
	if (guidoConf.layouts[guidoRun.current_layout][guidoRun.current_section].templates.indexOf(match_id) != -1) {
		// Append a random number to the element's ID to keep it unique
		var new_id = "guido_" + match_id + "_" + guidoGetRandom();
		$("#" + element.id).attr('id', new_id);

		// Attach the next template
		$("#" + new_id).html(guidoRun.templates[guidoRun.current_layout][match_id]);
		
		// Call gettext
		if (guidoRun.locale.length > 1)
			guidoTranslateNode(document.getElementById(new_id), null);
		
		// Call the corresponding app function, if such exists
		var app_func = 'appLoadTemplate_' + match_id;
		if (typeof window[app_func] == 'function')
			window[app_func]();
		
		// Dive further in
		$("#" + new_id).find("div").each(function(index, element){
			guidoLoadTemplate(index, element);
		});
	}
}


/**
 * Check if the supplied DIV has attached templates which need to be detached
 * @param index int The index of the DIV element.
 * @param element object The DIV element to be processed.
 */
function guidoUnloadTemplate(index, element) {
	guidoRun.logger.debug('Entering function guidoUnloadTemplate() with args: ' + index + ',' + element.id);
	
	// If the ID does not begin with 'guido_' there's nothing to detach here - return
	if (element.id.substring(0, 6) != 'guido_')
		return;

	// Strip the "guido_" prefix from DIV's ID
	var match_id = element.id.replace(/^guido_|_mount[0-9]{4}$/g, "");

	// If this is a mount point, proceed inside it
	if (element.id.match(/guido_.*_mount[0-9]{4}$/)) {
		// NB: We do not actually remove the HTML, we only replace mount point tags and invoke unload functions.
		// Actual HTML removal will happen when guidoLoadTemplate is recursively called. 
		// This help avoid any flicker and also automatically preserves any rendered template (while still invoking its load method)

		// Remove the random number from the element's ID
		var new_id = "guido_" + match_id;
		$("#" + element.id).attr('id', new_id);

		// Call the corresponding app function, if such exists
		var app_func = 'appUnloadTemplate_' + match_id;
		if (typeof window[app_func] == 'function')
			window[app_func]();

		// Dive further in
		$("#" + new_id).find("div").each(function(index, element){
			guidoUnloadTemplate(index, element);
		});
	}
}


/**
 * Synchronizing counter object
 * Make an instance and pass it a callback, which will be invoked when internal counter reaches 0.
 * @param cb function Callback to be invoked.
 */
function guidoSync(cb) {
	guidoRun.logger.debug('Creating new guidoSync object...');
	this.counter = 0;
	this.inc = function() {
		this.counter++;
	};
	this.dec = function() {
		this.counter--;
		if (this.counter == 0)
			cb();
	};
}


/**
 * Load JS list and iterate over it. 
 * @param prefix String Directory name to read the list from.
 * @param mode String The loading mode to use (text, binary).
 * @param sync Object The synchronisation object to use.
 * @param callback Function The callback to call for each file from the list.
 */
function guidoLoadList(prefix, mode, sync, callback) {
	guidoRun.logger.debug('Entering function guidoLoadList() with params: ' + prefix + ',' + mode);
	prefix = guidoConf.path + prefix;
	var entries = [];

	var xhr = new XMLHttpRequest();
	xhr.open("GET", prefix + "/guido.index", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			// Loop over the list, load entries
			entries = xhr.responseText.match(/[^\r\n]+/g);
			if ((! entries) || (! entries.length))
				return;

			entries.forEach(function(entry) {
				// Skip comments and empty lines 
				if (guidoSkipLine(entry))
					return;
			
				// Load the entry
				sync.inc();
				var xhr2 = new XMLHttpRequest();
				xhr2.open("GET", prefix + '/' + entry, true);
				if (mode == 'binary')
					xhr2.responseType = "arraybuffer";
				xhr2.onreadystatechange = function() {
					if (xhr2.readyState == 4 && xhr2.status == 200) {
						// Convert arraybuffer to base64 for binary
						var entry_data = null;
						if (mode == 'binary')
							// NB: We cannot use this beautiful stanza for anything larger than 64KB because we're likely to hit the stack size limit 
							// (see how the Array.prototype.apply() works - so work around for larger files
							try {
								entry_data = btoa(String.fromCharCode.apply(null, new Uint8Array(xhr2.response)));
							}
							catch (e) {
								var bytes = new Uint8Array(xhr2.response);
								var len = bytes.byteLength;
								var binary = '';
								for (var i = 0; i < len; i++)
									binary += String.fromCharCode(bytes[i]);
								entry_data = btoa(binary);
							}
						else
							entry_data = xhr2.responseText;
				
						callback(entry, entry_data, sync);
					}
				};
				xhr2.send();
			});
	    }
	 };
	 xhr.send();
}

/**
 * Attach a script to the DOM.
 * @param script String The script to attach.
 * @param sync Object The synchronisation object to use.
 */
function guidoAttachJs(file_name, script, sync) {
	guidoRun.logger.debug('Entering function guidoAttachJs() with args: ' + file_name);
	
	var script_element = document.createElement("script");
	script_element.setAttribute("type", "text/javascript");
	script_element.innerHTML = script;
	
    var head = document.getElementsByTagName("head")[0] || document.documentElement;
    head.appendChild(script_element);
    
    if (sync)
    	sync.dec();
}

/**
 * Attach a CSS to the DOM
 * @param css String The CSS to attach.
 * @param sync Object The synchronisation object to use.
 */
function guidoAttachCss(css, sync) {
	guidoRun.logger.debug('Entering function guidoAttachCss()...');
    var pa = document.getElementsByTagName('head')[0] ;
    var el = document.createElement('style');
    el.type = 'text/css';
    el.media = 'screen';
    if(el.styleSheet)
    	el.styleSheet.cssText = css;// IE method
    else 
    	el.appendChild(document.createTextNode(css));// others
    pa.appendChild(el);
    
    if (sync)
    	sync.dec();
}

/**
 * Attach template to the storage
 * @param layout String The layout name to which the template belongs.
 * @param key String The template name to use as a key.
 * @param data String The template to attach.
 * @param sync Object The synchronisation object to use.
 */
function guidoAttachTemplate(layout, key, data, sync) {
	guidoRun.logger.debug('Entering function guidoAttachTemplate() with args: ' + layout + ',' + key);
	guidoRun.templates[layout][key] = data;
	if (sync)
		sync.dec();
}


/**
 * Attach PO file to the storage
 * @param key String The locale name to use as a key.
 * @param data String The PO file to attach.
 * @param sync Object The synchronisation object to use.
 */
function guidoAttachLocale(key, data, sync) {
	guidoRun.logger.debug('Entering function guidoAttachLocale() with args: ' + key);

	// Remove the ".po" from the end of the file
	key = key + '';
	key = key.replace('.po', '');

	guidoRun.locales[key] = data;
	if (sync)
		sync.dec();
}


/**
 * Attach image to the storage
 * @param key String The image file path and name to use as a key.
 * @param data String The image as Base64 to attach.
 * @param sync Object The synchronisation object to use.
 */
function guidoAttachImage(key, data, sync) {
	guidoRun.logger.debug('Entering function guidoAttachImage() with args: ' + key);
	guidoRun.images[key] = data;
	if (sync)
		sync.dec();
}

/**
 * Attach font to the storage
 * @param key String The font file path and name to use as a key.
 * @param data String The image as Base64 to attach.
 * @param sync Object The synchronisation object to use.
 */
function guidoAttachFont(key, data, sync) {
	guidoRun.logger.debug('Entering function guidoAttachFont() with args: ' + key);
	guidoRun.fonts[key] = data;

	// Create CSS entry for the font from its name, e.g. face-style-weight.ttf
	var parts1 = key.split('.');
	var parts2 = parts1[0].split('-');

	var fontType = parts1[1];
	var fontName = parts2[0];
	var fontStyle = parts2[1];
	var fontWeight = parts2[2];

	// Fix font type
	if (fontType = 'ttf')
		fontType = 'truetype';
	else if (fontType = 'eot')
		fontType = 'embedded-opentype';

	var css = '';
	css += "@font-face {\n";
	css += "font-family: '" + fontName + "';\n";
	css += "font-style: " + fontStyle + ";\n";
	css += "font-weight: " + fontWeight + ";\n";
	css += "src: url(data:application/x-font-" + fontType + ";base64," + data + ") format('" + fontType + "');\n";
	css += "}\n";

	guidoAttachCss(css, sync);
}

