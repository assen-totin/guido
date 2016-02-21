/**
 * GUIdo Gettext helpers.
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
 * Helper method to translate strings on the fly and to distinguish translatable strings in JS code
 * @param text String The string to be translated.
 * @returns String The translated string (as per current locale).
 */
function _(text) {
	return guidoRun.gettext.gettext(text);
}


/**
 * Load a particular locale
 * @param locale String The name of the locale to load.
 * @param sync Sync The synchronization object to use.  
 * @param f Function Function to call when the locale is loaded. 
 */
function guidoLoadLocale(locale, sync, f) {
	guidoRun.logger.debug('Entering function guidoLoadLocale() with args: ' + locale);
	var prefix = guidoConf.path + '/app/locale/';
	guidoRun.locale = locale;
	
	// Check if we have it in the cache and return
	if (guidoRun.locales[locale]) {
		if (sync)
			sync.inc();

		guidoRun.gettext = new Gettext(guidoRun.locales[locale]);

		// Cache the PO object from gettext
		var po_key = guidoConf.locale + ':' + locale;
		guidoRun.po[po_key] = guidoRun.gettext._locale_data.guido;

		if (sync)
			sync.dec();

		if (typeof f == 'function')
			f();

		return;
	}

	if (sync)
		sync.inc();

	var xhr = new XMLHttpRequest;
	xhr.open("GET", prefix + locale + ".po", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			guidoRun.locales[locale] = xhr.responseText;
			guidoRun.gettext = new Gettext(guidoRun.locales[locale]);

			// Cache the PO object from gettext
			var po_key = guidoConf.locale + ':' + locale;
			guidoRun.po[po_key] = guidoRun.gettext._locale_data.guido;

			if (sync)
				sync.dec();
			if (typeof f == 'function')
				f();
	    }
	 };
	 xhr.send();
}

/**
 * Translate all text strings inside the given node using Gettext
 * @param node Object The starting node in the tree
 * @param translator Object The translator to use (default: use the global one)
 */
function guidoTranslateNode(node, translator) {
	//guidoRun.logger.debug('Entering function guidoTranslateNode() with args: ' + node);

	// If no translator specified, use the global one
	if (! translator)
		translator = guidoRun.gettext;

	// Translate, if this is a string
	if (node.nodeType == 3)
		node.nodeValue = translator.gettext(node.nodeValue);
	
	// Translate if this is an input which has a 'placehodler' attribute (used in forms)
	if ((node.nodeType == 1) && node.attributes.placeholder)
		node.attributes.placeholder.value = translator.gettext(node.attributes.placeholder.value);

	// Dive in
	//TODO: make sure we do not traverse the same node twice... maybe add marker?
    node = node.firstChild;
    while(node) {
    	guidoTranslateNode(node, translator);
        node = node.nextSibling;
    }
}


/**
 * Translate the whole DOM tree using Gettext
 * @param locale String The new locale to translate to.
 * @param element DOM The DOM element to start traslating from (default: document.body)
 */
function guidoTranslateDom(locale, element) {
	guidoRun.logger.debug('Entering function guidoTranslateDom() with args: ' + locale);
	
	// Do nothing if current locale is empty (i.e.l10n is disabled in guido.conf) 
	if (guidoRun.locale.length < 5)
		return;
	
	// Save old locale
	var old_locale = guidoRun.locale;

	// From the cache, obtain the PO object for guidoConf.locale -> old_locale
	var old_domain = guidoRun.po[guidoConf.locale + ':' + old_locale];

	// Load the new locale (it will be read from cache if already loaded)
	guidoLoadLocale(locale, null, function() {
		// Compose the PO lookup key (old_locale -> new_locale PO file)
		var po_key = old_locale + ':' + guidoRun.locale;

		// Check if we already have this translation
		if (! guidoRun.po[po_key]) {
			// From the cache, obtain the PO object for guidoConf.locale -> locale
			var new_domain = guidoRun.po[guidoConf.locale + ':' + locale];

			// Prepare a new _locale_data object by combining the PO objects for old and new locales
			var po = {};
			po.head = new_domain.head;
			po.msgs = {};

			var keys_old = Object.keys(old_domain.msgs);
			var keys_new = Object.keys(new_domain.msgs);
			for (var i=0; i<keys_new.length; i++) {
				for (var j=0; j<keys_old.length; j++) {
					if (keys_new[i] == keys_old[j]) {
						po.msgs[old_domain.msgs[keys_old[j]][1]] = [];
						po.msgs[old_domain.msgs[keys_old[j]][1]][0] = null;
						po.msgs[old_domain.msgs[keys_old[j]][1]][1] = new_domain.msgs[keys_new[i]][1];
						break;
					}
				}
			}

			// Cache the new PO for future use
			guidoRun.po[po_key] = po;
		}

		// Build a translator object and replace its _locale_data
		var translator = new Gettext(guidoRun.locales[locale]);
		translator._locale_data.guido = guidoRun.po[po_key];
		
		// Translate
		if (! element)
			element = document.body;
		guidoTranslateNode(document.body, translator);
	});
}

