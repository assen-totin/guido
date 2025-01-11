/**
 * GUIdo compressor.
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

var fs = require('fs');

var Combine = require('./node_modules/combine');
var Minify = require('./node_modules/minify');
var Zip = require('../js/zip');

var guidoConf = require('../../app/conf/guido.conf');

// Our index file name
var index_file = 'guido.index';

// Root directory to traverse
var base_dir = '';

// File list array
var list = [];

// Minify
var minify = new Minify();

// ZIP file
var zip = new Zip();
var sync = new guidoSync(function(){
	var zipped = zip.getArrayBuffer();
	fs.writeFileSync('../../public/guido.zip', Buffer.from(zipped));
});

// Combiner for Guido JS files
var combine = new Combine();
var sync_combine = new guidoSync(function(){
	var combined = combine.getBuffer();
	fs.writeFileSync('../js.min/guido.min.js', combined);
});

// Walk dirs that will be indexed and compressed
var dirs = ['app/css', 'app/templates', 'app/locale'];
for (var i=0; i < dirs.length; i++) {
	base_dir = '../../' + dirs[i];
	list = [];
	walk(base_dir, {list:list, zip:zip, combine:null, minify:null, base64:false});
	fs.writeFileSync(base_dir + '/' + index_file, formatFile(list));
}

// Walk dirs that will be indexed, base64 and compressed
var dirs = ['app/fonts', 'guido/fonts'];
for (var i=0; i < dirs.length; i++) {
	base_dir = '../../' + dirs[i];
	list = [];
	walk(base_dir, {list:list, zip:zip, combine:null, minify:null, base64:true});
	fs.writeFileSync(base_dir + '/' + index_file, formatFile(list));
}

// Walk dirs that will be indexed, minified and compressed
var dirs = ['app/js'];
for (var i=0; i<dirs.length; i++) {
	base_dir = '../../' + dirs[i];
	list = [];
	walk(base_dir, {list:list, zip:zip, combine:null, minify:minify, base64:false});
	fs.writeFileSync(base_dir + '/' + index_file, formatFile(list));
}

// Walk APP images (index and compress)
if (guidoConf.preload_images) {
	base_dir = '../../app/images';
	list = [];
	walk(base_dir, {list:list, zip:zip, combine:null, minify:null, base64:true});
	fs.writeFileSync(base_dir + '/' + index_file, formatFile(list));	
}

// Walk Guido vendor JS (index, minify, compress)
base_dir = '../../guido/vendor';
list = [];
walk(base_dir, {list:list, zip:zip, combine:null, minify:minify, base64:false});
fs.writeFileSync(base_dir + '/' + index_file, formatFile(list));

// Walk Guido JS (index, minify, combine)
base_dir = '../../guido/js';
walk(base_dir, {list:null, zip:null, combine:combine, minify:minify, base64:false});

// Generate the index.min.html from index.html: 
var indexHtml = fs.readFileSync('../../public/index.html', 'utf8');
var reGuidoMin = /^\s*<\s*script\s*src\s*=\s*guido\/js\/guido\.js.*$/gm;
var reGuidoAll = /^\s*<\s*script\s*src\s*=\s*guido\/js\/.*$/gm;
// Replace guido.js with guido.min.js
var indexHtmlMin = indexHtml.replace(reGuidoMin, '<script src=guido/js.min/guido.min.js></script>');
// Remove all other guido scripts
indexHtmlMin = indexHtmlMin.replace(reGuidoAll, '');
// Write to minified file
fs.writeFileSync('../../public/index.min.html', indexHtmlMin);

/**
 * Walk a directory, adding its file to the list.
 * @param dir String The directory to walk.
 * @param list Array The list of files to add entries to.
 * @param zip Zip The ZIP object to add each file to.
 * @param combine Combine The Combine object to add each file to.
 * @param minify Minify The Minify object to monify each file.
 * @param base64 Bool Whether to convert the file to Base64.
 */
function walk(dir, options) {
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
			walk(dir + '/' + files[i], options);
		else if (stat.isFile()) {
			if (options.list) {
				var _tmp = dir.replace(base_dir, '') + '/' + files[i];
				list.push(_tmp.replace(/^\//,''));							
			}

			// Read the file
			var fileBufRaw = fs.readFileSync(dir + '/' + files[i]);

			// Minify if requested
			var fileBufMin = fileBufRaw;
			if (options.minify) {
				// Skip files that are already minified
				if (files[i].indexOf('.min.') < 0)
					fileBufMin = options.minify.minifyBuffer(fileBufRaw)
			}

			// Base64 if requested
			var fileBuf = (options.base64) ? Buffer.from(fileBufMin.toString('base64')) : fileBufMin;

			if (options.combine) {
				sync_combine.inc();
				options.combine.addBuffer(fileBuf, function(){
					sync_combine.dec();
				});
			}

			if (options.zip) {
				sync.inc();
				var path = dir + '/' + files[i];
				path = path.replace('../../', '');

				options.zip.addBuffer(fileBuf, path, function(){
					sync.dec();
				});
			}
		}
		else
			console.log('Neither a directory nor a file: ' + dir + '/' + files[i]);
	}	
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

