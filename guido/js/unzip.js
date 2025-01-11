/**
 * GUIdo unZIP library.
 * 
 * @author Assen Totin assen.totin@gmail.com
 * @author ADM Blog www.another-d-mention.ro
 * @author Snipplr www.snipplr.com
 * 
 * Created for the GUIdo project, copyright (C) 2014 Assen Totin, assen.totin@gmail.com
 * Contains modified code and ideas from ADM Blog and Snipplr. 
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

function guidoUnzip(array_buffer, callback) {
	var test = null;
	var self = this;

	this.callback = callback;

	// Storage for extracted files
	this.files = {};

	var zip_constants = {
		// Local file header
		LOCSIG: 0x04034b50,	// "PK\003\004"
		LOCCMP: 8,		// offset for compression method
		LOCSZC: 18,		// compressed file size
		LOCSZU: 22,		// uncompressed file size
		LOCNAM: 26, 		// offset for file name length
		LOCXTR: 28, 		// offset for extra field size
		LOCHDR: 30,		// LOC header base size
		// Central Directory (CD)
		CENSIG: 0x02014b50,	// "PK\001\002"
		CENNAM: 28,		// filename length
		CENXTR: 30, 		// offset for extra field size
		CENCOM: 32, 		// offset for comment field size
		CENOFF: 42,		// LOC header offset
		CENHDR: 46,		// CEN header size
		// End Of Central Directory (EOCD)
		ENDSIG: 0x06054b50,	// "PK\005\006"
		ENDTOT: 10,		// total number of entries
		ENDOFF: 16,		// offset of first CEN header
		ENDHDR: 22,		// END header size (when there are no comments!)
		// Compression methods accepted
		STORE: 0,
		DEFLATE: 8
	};

	// Main data view
	var abdv = new DataView(array_buffer);

	/**
	 * Decompress data, compressed with DEFLATE (raw).
	 * @param filename String The full path and filename for this file as given in the ZIP archive.
	 * @param buffer Buffer The data to decompress.
	 * @param cb Function The callback that will receive the decompressed data.
	 */
	this.inflate = async function(filename, buffer, cb) {
		var chunks = [];
		var length = 0;
		
		// Convert the string to a byte stream
		const stream = new Blob([buffer]).stream();

		// Create a compressed stream
		const decompressedStream = stream.pipeThrough(
			new DecompressionStream("deflate-raw")
		);

		for await (const chunk of decompressedStream) {
			length += chunk.length;
			chunks.push(chunk);
		}

		var decompressed = new Uint8Array(length);
		decompressed.set(chunks[0]);
		var written = chunks[0].length;
		for (var i=1; i < chunks.length; i++) {
			decompressed.set(chunks[i], written);
			written += chunks[i].length;
		}

		cb(null, {filename: filename, data: decompressed});
	};

	/**
	 * Method to extract a particular file. 
	 * @param filename String The full path and filename for this file as given in the ZIP archive.
	 * @param offset int Offset in bytes from the beginning of the ZIP where the particular file header starts.  
	 * @param cb Function The callback that will receive the decompressed data.
	 */
	this.extractFile = async function(filename, offset, cb) {
		// Sanity checks
		var test = null;

		// Check magic number: it is always Little Endian
		test = abdv.getInt32(offset, true);
		if (test != zip_constants.LOCSIG)
			return cb("Cannot find ZIP header in the supplied data chunk!");

		// Check compression method: we can only process STORE and DEFLATE
		var compression_method = abdv.getInt16(offset + zip_constants.LOCCMP, true);
		if ((compression_method != zip_constants.STORE) && (compression_method != zip_constants.DEFLATE))
			return cb ("Unsupported compression method: " + compression_method);

		// Extra filed length in bytes
		var extra_length = abdv.getUint16(offset + zip_constants.LOCXTR, true);

		// Compressed file size
		var compressed_length = abdv.getUint32(offset + zip_constants.LOCSZC, true);

		// Uncompressed file size
		var uncompressed_length = abdv.getUint32(offset + zip_constants.LOCSZU, true);

		// Actual data starts here: offset + zip_constants.LOCHDR + filename_length + extra_length
		var data_start = offset + zip_constants.LOCHDR + filename_length + extra_length;
		switch(compression_method) {
			case zip_constants.STORE: 
				return cb(null, {filename: filename, data: array_buffer.slice(data_start, data_start + compressed_length)});
			case zip_constants.DEFLATE:
				await this.inflate(filename, array_buffer.slice(data_start, data_start + compressed_length), function(error, inflated){
					return cb(error, inflated);
				});
		}
	};

	/**
	 * Helper method to get file's extension
	 * @param filename String The filename to process
	 * @returns String The filename's extension.
	 */
	this.getFileExtension = function(filename) {
		return (/[.]/.exec(filename)) && /[^.]+$/.exec(filename)[0] || '';
	};

	/**
	 * Helper method to check if the supplied file extension is of an image file.
	 * @params extension String The extension to check.
	 * @returns boolean TRUE if the extension belongs to an image type, FALSE otherwise.  
	 */
	this.isImage = function(extension) {
		extension = extension.toLowerCase();

		if ((extension == 'gif') || (extension == 'png') || (extension == 'jpg') || (extension == 'jpeg'))
			return true;
		return false;
	};

	/**
	 * Helper method to check if the supplied file extension is of a font file.
	 * @params extension String The extension to check.
	 * @returns boolean TRUE if the extension belongs to an image type, FALSE otherwise.  
	 */
	this.isFont = function(extension) {
		extension = extension.toLowerCase();

		if ((extension == 'ttf') || (extension == 'woff') || (extension == 'woff2') || (extension == 'svg') || (extension == 'eot'))
			return true;
		return false;
	};

	/**
	 * Helper method to check if the supplied file extension is of a text file.
	 * @params extension String The extension to check.
	 * @returns boolean TRUE if the extension belongs to an text type, FALSE otherwise.  
	 */
	this.isText = function(extension) {
		extension = extension.toLowerCase();

		if ((extension == 'css') || (extension == 'template') || (extension == 'js'))
			return true;
		return false;
	};

	/**
	 * Helper method to get file name(s) by a partial match of its name.
	 * @param filename String The string to match. 
	 * @returns Array The matching file names. 
	 */
	this.findFiles = function(filename) {
		var keys = Object.keys(this.files);
		var res = [];
		for (var i=0; i<keys.length; i++) {
			if (keys[i].match(filename))
				res.push(keys[i]);
		}
		return res;
	};
	
	/**
	 * Helper method to get a file by a partial match of its name.
	 * @param filename String The string to match. 
	 * @returns Object The first file which was found to match. 
	 */
	this.getFile = function(filename) {
		var keys = Object.keys(this.files);
		for (var i=0; i<keys.length; i++) {
			if (keys[i].match(filename))
				return this.files[keys[i]];
		}
		return null;
	};
	
	/**
	 * Main processing of the ZIP start here
	 */
	
	// Check EOCD signature
	test = abdv.getInt32(array_buffer.byteLength - zip_constants.ENDHDR, true);
	if (test != zip_constants.ENDSIG)
		return this.callback("Cannot find EOCD header in the supplied file: either not a ZIP file or a ZIP file with comments (not supported).");

	// Number of CD entries
	var cd_entries = abdv.getInt16(array_buffer.byteLength - zip_constants.ENDHDR + zip_constants.ENDTOT, true);

	// CD offset
	var cd_offset = abdv.getUint32(array_buffer.byteLength - zip_constants.ENDHDR + zip_constants.ENDOFF, true);

	var filename_length = 0;
	var filename = '';
	var extra_length = 0;
	var comment_length = 0;
	var loc_offset = 0;

	var sync = new guidoSync(function(){
		self.callback(null, self);
	});

	for (var i=0; i < cd_entries; i++) {
		// Check CD signature
		test = abdv.getUint32(cd_offset, true);
		if (test != zip_constants.CENSIG)
			return this.callback("Cannot find CD header in the supplied file: not a ZIP file.");

		// Filename length in bytes and filename
		filename_length = abdv.getInt16(cd_offset + zip_constants.CENNAM, true);
		filename = new TextDecoder().decode(array_buffer.slice(cd_offset + zip_constants.CENHDR, cd_offset + zip_constants.CENHDR +  filename_length));

		// LOC header offset for this file
		loc_offset = abdv.getUint32(cd_offset + zip_constants.CENOFF, true);

		// Extra filed length in bytes
		extra_length = abdv.getInt16(cd_offset + zip_constants.CENXTR, true);

		// Comment filed length in bytes
		comment_length = abdv.getInt16(cd_offset + zip_constants.CENCOM, true);

		cd_offset += zip_constants.CENHDR + filename_length + extra_length + comment_length;

		// Skip empty directories as we don't need them
		if (filename.substr(filename.length - 1, 1) == '/')
			continue;

		sync.inc();

		// Get the file... convert text to ASCII, images to Base64, store the rest as ArrayBuffer
		this.extractFile(filename, loc_offset, function(error, file) {
			if (error) {
				console.log(error);
				sync.dec();
				return;
			}

			var extension = self.getFileExtension(file.filename).toLowerCase();
			if (self.isText(extension))
				self.files[file.filename] = new TextDecoder().decode(file.data);
			else if (self.isImage(extension))
				self.files[file.filename] = new TextDecoder().decode(file.data);
			else if (self.isFont(extension))
				self.files[file.filename] = new TextDecoder().decode(file.data);
			else
				self.files[file.filename] = file.data;

			sync.dec();
		});
	}
}

