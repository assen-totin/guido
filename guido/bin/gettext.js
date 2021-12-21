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

// HTML-cleaning regular expression
var reHtml = /<(?:.|\n)*?>/gm;
var reEmpty = /^\s*$/;

// JS-cleaning regular expressions
var reJsSplit = /;|\+/g;
var reJsMatch = /'|"/;
var reJsStrip1 = /^(.*_\(')(.*)('\).*)$/;
var reJsStrip2 = /^(.*_\(")(.*)("\).*)$/;
var reJsPath = /(\.\.\/)+(app\/)/;

// PO-parsing regular expressions
var rePoMsgid = /^(msgid.*")(.*)(".*)$/;
var rePoMsgstr = /^(msgstr.*")(.*)(".*)$/;

// Our index file name
var index_file = 'guido.index';

// File list array
var list = [];

// Array that will store all strings
var stringsRaw = [];

// Walk APP templates
walk('../../app/templates', 'html', list);

// Walk APP JS
walk('../../app/js', 'js', list);

// Process files one by one
for (var i=0; i < list.length; i++) 
	lineProcessor(list[i], stringsRaw);

// Deduplicate the strings
var stringsDedup = deduplicate(stringsRaw);

// Generate the POT file
var base_dir = '../../app/locale';
var pot = generatePot(stringsDedup);
fs.writeFileSync(base_dir + '/master.pot', pot);

// Report
console.log("* Generated new master POT file in " + base_dir + '/master.pot');

// Get all PO files
var listPo = [];
walk(base_dir, 'po', listPo);

for (var i=0; i < listPo.length; i++) {
	if (listPo[i] != 'master.pot')
		poProcessor(listPo[i], stringsDedup);
}

console.log('* All done.');


/**
 * Walk a directory, adding its file to the list.
 * @param dir String The directory to walk.
 * @param type String The type of files in the directory.
 * @param list Array The list of files to add entries to.
 */
function walk(dir, type, list) {
	var files = fs.readdirSync(dir);
	for (var i=0; i < files.length; i++) {
		// Skip hidden files and directories
		if (files[i].substring(0,1) == ".")
			continue;
		
		// Skip our index file
		if (files[i] == index_file)
			continue;

		var path = dir + '/' + files[i];

		// Check if this is a directory
		var stat = fs.statSync(path);
		if (stat.isDirectory()) 
			// Dive in
			walk(path, type, list);
		else {

		// Get file name from path
			list.push({
				type: type,
				path: path,
				name: path.replace(reJsPath, ''),
			});
		}
	}	
}

/**
 * Process a file line by line
 * @param fileItem Object The object with the descritpion of the file to process. 
 * @param stringsRaw Array Where to add the extracted chunks of text to.
 */

function lineProcessor(fileItem, stringsRaw) {
	var counter = 0;

	const data = fs.readFileSync(fileItem.path, 'UTF-8');

    // Split the contents by new line
    const lines = data.split(/\r?\n/);

	for (var i=0; i < lines.length; i++) {
		var strings;
		counter ++;

		// Invoke proper parser
		if (fileItem.type == 'html')
			strings = stripHtml(lines[i]);
		else if (fileItem.type == 'js')
			strings = stripJs(lines[i]);

		// Push the strings to the array
		if (strings) {
			for (var j=0; j< strings.length; j++) {
				stringsRaw.push({
					msgid: strings[j],
					files: [{
						file: fileItem.name,
						line: counter
					}]
				});
			}
		}
	}
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
 * @param stringsRaw Array Objects, one for each string, with 2 properties: 'msgid' (the text to write) and 'files' (array of objects with properties 'file' - the filename that has the string and 'line' - the line on which the string occurs).
 * @returns Array Similar array as the input, but with duplicate text removed (file and line moved into the 'files' array of each object).
 */

function deduplicate(stringsRaw) {
	var dedup = [];
	var match = false;
	var j = 0;
	for (var i=0; i < stringsRaw.length; i++) {
		match = false;
		for (j=0; j < dedup.length; j++) {
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
			for (var j=0; j < stringsDedup[i].files.length; j++) {
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
 * @param fileItem Object The object with the descritpion of the file to process. 
 * @param stringsDedup Array Deduplicated array of strings (as returned by the deduplicate() function).
 */

function poProcessor(fileItem, stringsDedup) {
	var status = 'waiting';
	var text = '';
	var textMsgid = '';
	var textComment = '';
	var strings = [];

	const data = fs.readFileSync(fileItem.path, 'UTF-8');

    // Split the contents by new line
    const lines = data.split(/\r?\n/);

	for (var i=0; i < lines.length; i++) {
		var line = lines[i];

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
	}

/*
	// Flush the last object (because we don't get the emptry lines from the reader)
	if (status == 'msgstr') {
		status = 'waiting';
		strings.push({
			comment: textComment,
			msgid: textMsgid,
			msgstr: text,
		});
	}		
*/

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
	fs.writeFileSync(fileItem.path, po);

	// Report
	console.log("* Updating translations in " + fileItem.path);
}


/**
 * Serialisation object
 * @param array Array The input array, from which one element will be passed to each invocation of the each() function.
 * @param each function Function to invoke for each element of the input array.
 * @param done function Function to be invoked after all elements of the input array have been processed.
 */
function guidoSerialise(array, each, done) {
    this.counter = -1;
 
    /**
     * Get current element
     */
    this.getEntry = function(id) {
        if (id) {
            return array[id];   
        }
        else {
            return array[this.counter]; 
        }
    };
     
     
    /**
     * Process next element of the array or call the done() function  
     */
    this.run = function(delay) {
        this.counter++;
        var self = this;
        if (array[this.counter]) {
            if (typeof(each) === 'function') {
                setTimeout(function(){
                    each(array[self.counter]);
                }, delay);                  
            }
        }
        else {
            // When last file from the input array is processed...
            if (typeof(done) === 'function') {
                done(); 
            }
        }
    };
};


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

