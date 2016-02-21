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

/**
 * Implementation of slice() function for ArrayBuffer for IE10
 */
if (!ArrayBuffer.prototype.slice)
	ArrayBuffer.prototype.slice = function (start, end) {
	   		var that = new Uint8Array(this);
	   		if (end == undefined) end = that.length;
	   		var result = new ArrayBuffer(end - start);
	   		var resultArray = new Uint8Array(result);
	   		for (var i = 0; i < resultArray.length; i++)
	   			resultArray[i] = that[i + start];
	   		return result;
	};

/**
 * Uncompressor for the DEFLATE algorithm
 * @params inbuf ArrayBuffer The compressed data to extract. 
 */
var ZipInflater = function(inbuf) {
	var MAXBITS = 15, MAXLCODES = 286, MAXDCODES = 30, MAXCODES = 316, FIXLCODES = 288,
		LENS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258],
		LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0],
		DISTS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
		DEXT = [ 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13],
		incnt = 0,  // bytes read so far from input
		outpos = 0, // bytes written so far to output buffer
		bitbuf = 0, // bit buffer
		bitcnt = 0, // number of bits in bit buffer
		// Huffman code decoding tables
		lencode = undefined,
		distcode = undefined,
		// DataViews for inpout and output ByteArrays
		inbuf_dv = new DataView(inbuf),
		outbuf_dv = undefined;

	/**
	 * Check bits
	 * @param need int The number of bits to check
	 * @returns int The check result.
	 */
	function bits(need) {
		var val = bitbuf;
		while(bitcnt < need) {
			if (incnt == inbuf.byteLength) 
				throw 'Bit check: available inflate data did not terminate.';
			val |= inbuf_dv.getUint8(incnt++) << bitcnt;
			bitcnt += 8;
		}
		bitbuf = val >> need;
		bitcnt -= need;
		return val & ((1 << need) - 1);
	}

	/**
	 * Construct a table
	 * @param h Object Table handler
	 * @param length int Table size
	 * @param n int Number of table entries
	 * @returns int Left entries
	 */
	function construct(h, length, n) {
		var offs = new Array();
		for (var len = 0; len <= MAXBITS; len++) h.count[len] = 0;
		for (var symbol = 0; symbol < n; symbol++) h.count[length[symbol]]++;
		if(h.count[0] == n) return 0;
		var left = 1;
		for(len = 1; len <= MAXBITS; len++) {
			left <<= 1;
			left -= h.count[len];
			if(left < 0) return left;
		}
		offs[1] = 0;
		for(len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + h.count[len];
		for(symbol = 0; symbol < n; symbol++)
			if(length[symbol] !== 0) h.symbol[offs[length[symbol]]++] = symbol;
		return left;
	}

	/**
	 * Decoding function
	 * @param h Object Table handler
	 * @returns int Error code
	 */
	function decode(h) {
		var code = 0, first = 0, index = 0;
		for(var len = 1; len <= MAXBITS; len++) {
			code |= bits(1);
			var count = h.count[len];
			if(code < first + count) return h.symbol[index + (code - first)];
			index += count;
			first += count;
			first <<= 1;
			code <<= 1;
		}
		return -9; // ran out of codes
	}

	/**
	 * Check symbol against abailable codes in table
	 * @params buf ArrayBuffer The buffer to check.
	 * @returns int The symbol found.
	 */
	function codes(buf) {
		do {
			var symbol = decode(lencode);
			if(symbol < 0) 
				return symbol;
			else if(symbol < 256) {
				outbuf_dv.setUint8(outpos, symbol);
				outpos ++;
			}
			else if(symbol > 256) {
				symbol -= 257;
				if(symbol >= 29) 
					throw "Codes: invalid literal/length or distance code in fixed or dynamic block.";
				var len = LENS[symbol] + bits(LEXT[symbol]);
				symbol = decode(distcode);
				if(symbol < 0) 
					return symbol;
				var dist = DISTS[symbol] + bits(DEXT[symbol]);
				if(dist > outpos) 
					throw "Codes: distance is too far back in fixed or dynamic block.";
				while(len--) {
					outbuf_dv.setUint8(outpos, outbuf_dv.getUint8(outpos - dist));
					outpos ++;
				}
			}
		} while (symbol != 256);
		return 0;
	}

	/**
	 * Extact a stored (uncompressed) block
	 * @params buf ArrayBuffer The block to extract.
	 */
	function stored(buf) {
		bitbuf = 0;
		bitcnt = 0;
		if (incnt + 4 > inbuf.length()) 
			throw 'Stored: available inflate data did not terminate';
		var len = inbuf[incnt++];
		len |= inbuf[incnt++] << 8;
		if (inbuf[incnt++] != (~len & 0xff) || inbuf[incnt++] != ((~len >> 8) & 0xff))
			throw "Stored: block length did not match one's complement";
		if (incnt + len > inbuf.length()) 
			throw 'Stored: available inflate data did not terminate.';
		while (len--) 
			buf[buf.length] = inbuf[incnt++];
	}

	/**
	 * Constructs a fixed decoding table.
	 */
	function constructFixedTables() {
		var lengths = new Array();
		// literal/length table
		for(var symbol = 0; symbol < 144; symbol++) lengths[symbol] = 8;
		for(; symbol < 256; symbol++) lengths[symbol] = 9;
		for(; symbol < 280; symbol++) lengths[symbol] = 7;
		for(; symbol < FIXLCODES; symbol++) lengths[symbol] = 8;
		construct(lencode, lengths, FIXLCODES);
		for(symbol = 0; symbol < MAXDCODES; symbol++) lengths[symbol] = 5;
		construct(distcode, lengths, MAXDCODES);
	}

	/**
	 * Constrcuts a dynamic decoding table.
	 */
	function constructDynamicTables() {
		var lengths = new Array(),
			order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
			nlen = bits(5) + 257,
			ndist = bits(5) + 1,
			ncode = bits(4) + 4;
		if (nlen > MAXLCODES || ndist > MAXDCODES) throw "dynamic block code description: too many length or distance codes";
		for (var index = 0; index < ncode; index++) 
			lengths[order[index]] = bits(3);
		for (; index < 19; index++) 
			lengths[order[index]] = 0;
		var err = construct(lencode, lengths, 19);
		if(err !== 0) 
			throw "Dynamic table: dynamic block code description: code lengths codes incomplete";
		index = 0;
		while (index < nlen + ndist) {
			var symbol = decode(lencode), len;
			if (symbol < 16) 
				lengths[index++] = symbol;
			else {
				len = 0;
				if (symbol == 16) {
					if (index === 0) 
						throw "Dynamic table: dynamic block code description: repeat lengths with no first length";
					len = lengths[index - 1];
					symbol = 3 + bits(2);
				}
				else if(symbol == 17) 
					symbol = 3 + bits(3);
				else 
					symbol = 11 + bits(7);
				if (index + symbol > nlen + ndist)
					throw "Dynamic table: dynamic block code description: repeat more than specified lengths";
				while (symbol--) 
					lengths[index++] = len;
			}
		}

		err = construct(lencode, lengths, nlen);
		if(err < 0 || (err > 0 && nlen - lencode.count[0] != 1)) 
			throw "Dynamic table: dynamic block code description: invalid literal/length code lengths";
		err = construct(distcode, lengths.slice(nlen), ndist);
		if (err < 0 || (err > 0 && ndist - distcode.count[0] != 1)) 
			throw "Dynamic table: dynamic block code description: invalid distance code lengths";
		return err;
	}

	return {
		/**
		 * The main method to extract the file
		 * @param buf ArrayBuffer Empty buffer to write the extracte data to.
		 * @returns int Error code.  
		 */
		inflate : function(buf) {
			outbuf_dv = new DataView(buf);
			incnt = bitbuf = bitcnt = 0;
			var err = 0;
			do {
				var last = bits(1);
				var type = bits(2);
				if (type === 0) stored(buf); // uncompressed block
				else if (type == 3) 
					throw 'Inflate: invalid block type (type == 3)';
				else { // compressed block
					lencode = {count:[], symbol:[]};
					distcode = {count:[], symbol:[]};
					if(type == 1) 
						constructFixedTables();
					else if(type == 2) 
						err = constructDynamicTables();
					if(err !== 0) 
						return err;
					err = codes(buf);
				}
				if (err !== 0) 
					break;
			} while (!last);
			return err;
		}
	};
};

/**
 * ZIP container parser
 */
function ZipFile(array_buffer) {
	var test = null;

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
	 * Convert ArrayBuffer to String (treat input as UTF-8)
	 * @param byte_array ArrayBuffer The raw data to convert to string.
	 * @returns String The input converted to string as UTF-8.  
	 */
	this.ab2utf = function(byte_array) {
		var ix = 0;
		var ba_dv = new DataView(byte_array);
	 
		if( byte_array.slice(0,3) == "\xEF\xBB\xBF")
			ix = 3;

		var string = "";
		for( ; ix < byte_array.byteLength; ix++ ) {
			var byte1 = ba_dv.getUint8(ix);
			if( byte1 < 0x80 )
				string += String.fromCharCode(byte1);
			else if( byte1 >= 0xC2 && byte1 < 0xE0 ) {
				var byte2 = ba_dv.getUint8(++ix);
				string += String.fromCharCode(((byte1&0x1F)<<6) + (byte2&0x3F));
			}
			else if( byte1 >= 0xE0 && byte1 < 0xF0 ) {
				var byte2 = ba_dv.getUint8(++ix);
				var byte3 = ba_dv.getUint8(++ix);
				string += String.fromCharCode(((byte1&0xFF)<<12) + ((byte2&0x3F)<<6) + (byte3&0x3F));
			} 
			else if( byte1 >= 0xF0 && byte1 < 0xF5) {
				var byte2 = ba_dv.getUint8(++ix);
				var byte3 = ba_dv.getUint8(++ix);
				var byte4 = ba_dv.getUint8(++ix);
				var codepoint = ((byte1&0x07)<<18) + ((byte2&0x3F)<<12)+ ((byte3&0x3F)<<6) + (byte4&0x3F);
				codepoint -= 0x10000;
				string += String.fromCharCode((codepoint>>10) + 0xD800, (codepoint&0x3FF) + 0xDC00);
			}
		}
		return string;
	};

	/**
	 * Method to extract a particular file. 
	 * @param offset int Offset in bytes from the beginning of the ZIP where the particular file header starts. 
	 * @returns ByteArray The uncompressed data of the file. 
	 */
	this.extractFile = function(offset) {
		// Sanity checks
		var test = null;

		// Check magic number: it is always Little Endian
		test = abdv.getInt32(offset, true);
		if (test != zip_constants.LOCSIG)
			throw new Error("Cannot find ZIP header in the supplied data chunk!");

		// Check compression method: we can only process STORE and DEFLATE
		var compression_method = abdv.getInt16(offset + zip_constants.LOCCMP, true);
		if ((compression_method != zip_constants.STORE) && (compression_method != zip_constants.DEFLATE))
			throw new Error("Unsupported compression method; please, use STORE or DEFLATE!");

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
				return array_buffer.slice(data_start, data_start + compressed_length);
			case zip_constants.DEFLATE:
				var inflater = new ZipInflater(array_buffer.slice(data_start, data_start + compressed_length));
				var res = new ArrayBuffer(uncompressed_length);
				var err = inflater.inflate(res);
				if (!err)
					return res;
				return null;
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
		throw new Error("Cannot find EOCD header in the supplied file: either not a ZIP file or a ZIP file with comments (not supported).");

	// Number of CD entries
	var cd_entries = abdv.getInt16(array_buffer.byteLength - zip_constants.ENDHDR + zip_constants.ENDTOT, true);

	// CD offset
	var cd_offset = abdv.getUint32(array_buffer.byteLength - zip_constants.ENDHDR + zip_constants.ENDOFF, true);

	var filename_length = 0;
	var filename = '';
	var extra_length = 0;
	var comment_length = 0;
	var loc_offset = 0;
	for (var i=0; i<cd_entries; i++) {
		// Check CD signature
		test = abdv.getUint32(cd_offset, true);
		if (test != zip_constants.CENSIG)
			throw new Error("Cannot find CD header in the supplied file: not a ZIP file.");

		// Filename length in bytes and filename
		filename_length = abdv.getInt16(cd_offset + zip_constants.CENNAM, true);
		filename = this.ab2utf(array_buffer.slice(cd_offset + zip_constants.CENHDR, cd_offset + zip_constants.CENHDR +  filename_length));

		// LOC header offset for this file
		loc_offset = abdv.getUint32(cd_offset + zip_constants.CENOFF, true);

		// Extra filed length in bytes
		extra_length = abdv.getInt16(cd_offset + zip_constants.CENXTR, true);

		// Comment filed length in bytes
		comment_length = abdv.getInt16(cd_offset + zip_constants.CENCOM, true);

		cd_offset += zip_constants.CENHDR + filename_length + extra_length + comment_length;

		// Skip empty directories as we don't need them
		if (filename.substr(filename.length - 1, 1) != '/') {
			// Get the file... convert text to ASCII, images to Base64, store the rest as ArrayBuffer
			var file = this.extractFile(loc_offset);
			var extension = this.getFileExtension(filename).toLowerCase();
			if (this.isText(extension)) 
				this.files[filename] = this.ab2utf(file);
			else if (this.isImage(extension))
				//this.files[filename] = btoa(String.fromCharCode.apply(null, new Uint8Array(file)));
				this.files[filename] = this.ab2utf(file);
			else if (this.isFont(extension))
				//this.files[filename] = btoa(String.fromCharCode.apply(null, new Uint8Array(file)));
				this.files[filename] = this.ab2utf(file);
			else
				this.files[filename] = file;
		}
	}
}
