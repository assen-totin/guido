/**
 * Gettext parser for GUIdo.
 * 
 * @author Assen Totin assen.totin@gmail.com
 * 
 * Created for the GUIdo project, copyright (C) 2015 Assen Totin, assen.totin@gmail.com 
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

var fs = require('fs');
var LineReader = require('liner');

// HTML-cleaning regular expression
var reHtml = /<(?:.|\n)*?>/gm;
var reEmpty = /^\s*$/;

// JS-cleaning regular expressions
var reJsSplit = /;|\+/g;
var reJsMatch = /'|"/;
var reJsStrip1 = /^(.*_\(')(.*)('\).*)$/;
var reJsStrip2 = /^(.*_\(")(.*)("\).*)$/;

// PO-parsing regular expressions
var rePoMsgid = /^(msgid.*")(.*)(".*)$/;
var rePoMsgstr = /^(msgstr.*")(.*)(".*)$/;

// Our index file name
var index_file = 'guido.index';

// Root directory to traverse
var base_dir = '';

// File list array
var list = [];

// Array that will store all strings
var stringsRaw = [];

// Sync object to create the POT file once all files have been read
var sync = new guidoSync(function() {
	// Deduplicate the strings
	var stringsDedup = deduplicate(stringsRaw);

	// Generate the POT file
	base_dir = '../../app/locale';
	var pot = generatePot(stringsDedup);
	fs.writeFileSync(base_dir + '/master.pot', pot);

	// Report
	console.log("* Generated new master POT file in " + base_dir + '/master.pot');


	// Load existing PO files and merge the changes ito them
	base_dir = '../../app/locale';
	list = [];
	walk(base_dir, list, null, null);
	for (var i=0; i<list.length; i++)
		if (list[i] != 'master.pot')
			poProcessor(base_dir, list[i], stringsDedup);
});

// Walk APP templates
base_dir = '../../app/templates';
list = [];
walk(base_dir, list, null, null);
for (var i=0; i<list.length; i++) {
	sync.inc();
	lineProcessor(base_dir, list[i], 'html', stringsRaw);
}

// Walk APP JS
base_dir = '../../app/js';
list = [];
walk(base_dir, list, null, null);
for (var i=0; i<list.length; i++) {
	sync.inc();
	lineProcessor(base_dir, list[i], 'js', stringsRaw);
}


/**
 * Walk a directory, adding its file to the list.
 * @param dir String The directory to walk.
 * @param list Array The list of files to add entries to.
 * @param zip Zip The ZIP object to add each file to. 
 * @param combiner Combiner The Combiner object to add each file to. 
 */
function walk(dir, list, zip, combiner) {
	var files = fs.readdirSync(dir);
	for (var i=0; i<files.length; i++) {		
		// Skip hidden files and directories
		if (files[i].substring(0,1) == ".")
			continue;
		
		// Skip our index file
		if (files[i] == index_file)
			continue;
		
		// Check if this is a directory
		var stat = fs.statSync(dir + '/' + files[i]);
		if (stat.isDirectory()) 
			// Dive in
			walk(dir + '/' + files[i], list, zip);
		else {
			if (list) {
				var _tmp = dir.replace(base_dir, '') + '/' + files[i];
				list.push(_tmp.replace(/^\//,''));							
			}
		}
	}	
}

/**
 * Process a file line by line
 * @param filePrefix String The path prefix to prepend when reading the file (will not be shown in POT file); set to '' for none. 
 * @param fileName String The name of the file to process.
 * @param parser String The parser to invoke, either 'html' or 'js'
 * @param stringsRaw Array Where to add the extracted chunks of text to.
 */

function lineProcessor(filePrefix, fileName, parser, stringsRaw) {
	var counter = 0;

	// Create a line-by-line reader and the line processing function
	var liner = new LineReader(function(line){
		var strings;
		counter ++;

		// Invoke proper parser
		if (parser == 'html')
			strings = stripHtml(line);
		else if (parser == 'js')
			strings = stripJs(line);

		// Push the strings to the array
		if (strings) {
			for (var i=0; i< strings.length; i++) {
				stringsRaw.push({
					msgid: strings[i],
					files: [{
						file: fileName,
						line: counter
					}]
				});
			}
		}
	});

	// When reading ends, we need to call the sync object - so attach our callback to LineReader's internal signal
	liner.onSignal('end', function() {
		// Call the sync object
		sync.dec();		
	});

	// Attach the reader to the stream to start reading
	liner.attachSource(filePrefix + '/' + fileName);
}


/**
 * Strip HTML from a line
 * @param line String Line to process.
 * @returns Array Text chunks from the inputline after stripping HTML or NULL if no text was extracted.
 */
function stripHtml(line) {
	var ret = [];

	// Replace HTML with newlines in order to separate chunks of text withing diifferent tags.
	var stripped = line.replace(reHtml, '\n');
	if (stripped) {
		// Split by the newline, then push valid chunks into the return array
		var split = stripped.split('\n');

		for (var i=0; i<split.length; i++) {
			// If the chunk is empty, drop it
			if (split[i].match(reEmpty))
				continue;

			if (split[i]) 
				ret.push(split[i]);
		}
	}

	if (ret.length > 0)
		return ret;

	return null;
}


/**
 * Strip JS from a line
 * @param line String Line to process.
 * @returns Array Text chunks from the inputline after stripping HTML or NULL if no text was extracted.
 */
function stripJs(line) {
	var ret = [];

	// Only process lines which have a single or double quote in it
	if (! line.match(reJsMatch))
		return null;

	// Split by ';' or '+' sign
    splitted = line.split(reJsSplit);
    for (var i=0; i<splitted.length; i++) {
		// Extract text from single-quotes
		var stripped = splitted[i].match(reJsStrip1);
		if (stripped)
			ret.push(stripped[2]);

		// Extract text from double-quotes
		stripped = splitted[i].match(reJsStrip2);
		if (stripped)
			ret.push(stripped[2]);
	}

	if (ret.length > 0)
		return ret;

	return null;
}


/**
 * Deduplicate the strings array
 * @param stringsRaw Array Objects, one for each string, with 2 properties: 'msgid' (the text to write) and 'files' (array of objects with properties 'file' - the filename that has the string and 'line' - the line on shich the string occurs).
 * @returns Array Similar array as the input, but with duplicate text removed (file and line moved into the 'files' array of each object).
 */

function deduplicate(stringsRaw) {
	var dedup = [];
	var match = false;
	var j = 0;
	for (var i=0; i<stringsRaw.length; i++) {
		match = false;
		for (j=0; j<dedup.length; j++) {
			if (stringsRaw[i].msgid == dedup[j].msgid) {
				match = true;
				break;
			}
		}

		if (match)
			dedup[j].files.push(stringsRaw[i].files[0]);
		else 
			dedup.push(stringsRaw[i]);
	}

	return dedup;
}


/**
 * Generates a POT file
 * @param stringsDedup Array Deduplicated array of strings (as returned by the deduplicate() function).
 * @returns String Ready-to-write text of the POT file
 */
function generatePot(stringsDedup) {
	var pot = '';

	// Write a POT header
	pot += 'msgid ""\n';
	pot += 'msgstr ""\n';
	pot += '"Project-Id-Version: Guido-1.0\\n"\n';
	pot += '"Report-Msgid-Bugs-To: Assen Totin <assen.totin@gmail.com>\\n"\n';
	pot += '"POT-Creation-Date: 2014-09-09 12:23+0300\\n"\n';
	pot += '"PO-Revision-Date: 2014-09-09 12:24+0300\\n"\n';
	pot += '"Last-Translator: Assen Totin <assen.totin@gmail.com>\\n"\n';
	pot += '"Language-Team: Assen Totin <assen.totin@gmail.com>\\n"\n';
	pot += '"MIME-Version: 1.0\\n"\n';
	pot += '"Content-Type: text/plain; charset=utf-8\\n"\n';
	pot += '"Content-Transfer-Encoding: 8bit\\n"\n';
	pot += '"Plural-Forms: nplurals=2; plural=(n != 1);\\n"\n';
	pot += '\n';

	// Loop the object and write it
	for (var i=0; i<stringsDedup.length; i++) {
		var files = '';
		if (stringsDedup[i].comment)
			files = stringsDedup[i].comment;
		else {
			for (var j=0; j<stringsDedup[i].files.length; j++) {
				if (files)
					files += ', ';
				files += stringsDedup[i].files[j].file + ':' + stringsDedup[i].files[j].line;
			}
		}

		if (files.substr(0,1) != '#')
			pot += '# ';

		pot += files + '\n';
		pot += 'msgid "' + stringsDedup[i].msgid + '"\n';

		if (stringsDedup[i].msgstr)
			pot += 'msgstr "' + stringsDedup[i].msgstr + '"\n';
		else
			pot += 'msgstr ""\n';

		pot += '\n';
	}

	return pot;
}


/**
 * Process a PO file line by line and merge changes into it
 * @param filePrefix String The path prefix to prepend when reading the file (will not be shown in POT file); set to '' for none. 
 * @param fileName String The name of the file to process.
 * @param parser String The parser to invoke, either 'html' or 'js'
 * @param stringsRaw Array Where to add the extracted chunks of text to.
 */

function poProcessor(filePrefix, fileName, stringsDedup) {
	var status = 'waiting';
	var text = '';
	var textMsgid = '';
	var textComment = '';
	var strings = [];

	// Create a line-by-line reader and the line processing function
	var liner = new LineReader(function(line) {
		// We don't care for lines starting with '#'
		if (line.indexOf('#') == 0)
			textComment = line;

		// If a line starts with 'msgid'...
		else if (line.indexOf('msgid') == 0) {
			// Push everything we got so far
			if (status == 'msgstr') {
				status = 'waiting';
				strings.push({
					comment: textComment,
					msgid: textMsgid,
					msgstr: text,
				});
			}

			var m = line.match(rePoMsgid);
			if (m) {
				status = 'msgid';
				text = m[2];
			}
		}

		// If a line starts with 'msgstr'...
		else if (line.indexOf('msgstr') == 0) {
			textMsgid = text;
			var m = line.match(rePoMsgstr);
			if (m) {
				status = 'msgstr';
				text = m[2];
			}
		}

		// If this is an empty line... (but we dont get them from the reader).
		else if (line.length == 0) {
			status = 'waiting';
			strings.push({
				comment: textComment,
				msgid: textMsgid,
				msgstr: text,
			});
		}

		// If it is any other line, append it to current text
		else 
			text += '\n' + line;
	});

	// When reading ends, update the PO file
	liner.onSignal('end', function() {
		// Flush the last object (because we don't get the emptry lines from the reader)
		if (status == 'msgstr') {
			status = 'waiting';
			strings.push({
				comment: textComment,
				msgid: textMsgid,
				msgstr: text,
			});
		}		

		var stringsNew = [];

		// Push all strings that still exist (deleted one will be skipped)
		for (var i=0; i<strings.length; i++) {
			for (var j=0; j<stringsDedup.length; j++) {
				if (strings[i].msgid == stringsDedup[j].msgid) {
					stringsNew.push(strings[i]);
					break;
				}
			}
		}

		// Add newly created strings
		for (var i=0; i<stringsDedup.length; i++) {
			var found = false;
			for (var j=0; j<stringsNew.length; j++) {
				if (stringsNew[j].msgid == stringsDedup[i].msgid) {
					found = true;
					break;
				}
			}

			if (! found) {
				stringsNew.push({
					msgid: stringsDedup[i].msgid,
					msgstr: '',
					files: stringsDedup[i].files
				});
			}
		}

		// Generate the new PO file
		var po = generatePot(stringsNew);
		fs.writeFileSync(filePrefix + '/' + fileName, po);
	});

	// Attach the reader to the stream to start reading
	liner.attachSource(filePrefix + '/' + fileName);

	// Report
	console.log("* Updating translations in " + fileName);
}


/**
 * Synchronizing counter object
 * Make an instance and pass it a callback, which will be invoked when internal counter reaches 0.
 * @param cb function Callback to be invoked.
 */
function guidoSync(cb) {
	this.counter = 0;
	this.inc = function() {
		this.counter++;
	};
	this.dec = function() {
		this.counter--;
		if (this.counter == 0) {
			cb();
		}
	};
}


/**
 * Helper function to convert array to list of newline separated entries.
 * @param files Array The array of file names.
 * @returns String Newline-separated list of filenames. 
 */
function formatFile(files) {
	var res = '';
	for (var i=0; i<files.length; i++) 
		res += files[i] + '\n';
	return res;
}

