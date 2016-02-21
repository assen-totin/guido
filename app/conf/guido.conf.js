/**
 * Main condiguratoin file.
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

// Do not rename this variable!
var guidoConf = {
	// Application's name (will be set as page title)
	title: 'Guido',

	// Short app name to use with the local storage. Alphanumeric!
	ls: 'example',
	
	// Local path: anything that needs to be prepended when loading the app, e.g., '/mypath'
	// Leave empty if your site is the top-level directory.
	path: '',
	
	// Resources load method: set to 'true' to use the compressed archive 
	// or to 'false' to use the guido.index from inside directories.
	zip: false,
	
	// Pre-load images: set to 'true' to have all images from app/images pre-loaded at start-up,
	// either using guido.index or from the ZIP file (depending on the previous option);
	// setting to 'false' will not pre-load any images. 
	preload_images: true,
	
	// Cookie name used to handle direct links and refreshes:
	// If you change this, you need to also change it in your nginx.conf or httpd.conf!
	cookie_f5: 'guido_f5',
	
	// Log level
	// 0 - LOG_NONE, 1 - LOG_CRITICAL, 2 - LOG_ERROR, 3 - LOG_WARNING
	// 4 - LOG_NOTICE, 5 - LOG_TRACE,  - LOG_DEBUG
	log_level: 6,
	
	// Locale to use initially. Set blank to disable language switching.
	locale: 'en_US',

	// Default layout to load and default section (see below for layouts)
	layout: 'first',
	section: 'example1',
	
	// List of all layouts, sections and templates.
	// First-level key is the layout name. 
	// Second-level key is the section name. There are two special entries: 
	//   '_section' entry which should point to the default section the layout.
	//   '_root' entry which should point to the first (root) template of the layout.
	// Third level keys are section's name (i.e. gettext key) and an array with the names of all initially visible templates.
	// Note: templates for each layout should reside in a subdirectory of 'templates' with the same name, 
	// hence one template belongs to only one layout.  
	layouts: {
		first: {
			_section: 'example1',
			_root: 'root1',
			example1: {
				title: 'Example First',
				templates: ['root1', 'menu1', 'main1']
			},
			example2: {
				title: 'Example Second',
				templates: ['root1', 'menu1', 'main2']
			},
		},
		second: {
			_section: 'example3',
			_root: 'root2',
			example3: {
				title: 'Example Third',
				templates: ['root2', 'menu2', 'main3']
			},
			example4: {
				title: 'Example Forth',
				templates: ['root2', 'menu2', 'main4']
			}
		}
	}
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = guidoConf;

