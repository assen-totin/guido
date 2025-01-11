// ZIP builder module for GUIdo
var guidoZip = function() {
	var self = this;
	
	// Array to store objects compressed data-related stuff (one object per compressed file)
	// This has to be an array to maintain sequential writes (i.e. calculate LOC headers offset properly). 
	this.files = [];
	
	// LOC offset counter
	this.loc_offset = 0;

	// CRC32 table
	this.crc_table = this.makeCrcTable();
};


guidoZip.prototype.b2ab = function(buffer) {
	// NB: The underlying ArrayBuffer in the Buffer is bigger, so we need to trim it - but it is ummutable, so we need to copy
	// NB: In Buffer, the data in the ArrayBuffer starts at offset .byteOffset
	var ret = new ArrayBuffer(buffer.length);
	var retU8A = new Uint8Array(ret);
	retU8A.set(new Uint8Array(buffer.buffer).slice(buffer.byteOffset, buffer.length + buffer.byteOffset));
	return ret;
};

/**
 * Deflate a file
 * @param buffer ArrayBuffer The data from the file
 * @param path String The path of the file
 * @param callback Function The function to call when ready
 */
guidoZip.prototype.deflate = async function(ab, path, callback) {
	var self = this; 

	try {
		// On NodeJS: use the built-in ZLib
		// Convert the input from ArrayBuffer
		var buff = Buffer.from(ab);
		var zlib = require('zlib');
		zlib.createDeflateRaw();
		zlib.deflateRaw(buff, function(error, result) {
			// NB: The underlying ArrayBuffer in the Buffer is bigger, so we need to trim it
			callback(error, {raw: ab, compressed: self.b2ab(result), path: path});
		});
	}
	catch {
		// On browser: use CompressionStream
		// Convert the ArrayBuffer to a ReadableStream
		const stream = new Blob([ab]).stream();

		// Create a compressed stream
		const compressedStream = stream.pipeThrough(
			new CompressionStream("deflate-raw")
		);

		var chunks = [];
		var length = 0;

		for await (const chunk of compressedStream) {
			chunks.push(chunk);
			length += chunk.length;
		}

		var compressed = new Uint8Array(length);
		compressed.set(chunks[0]);
		var written = chunks[0].length;
		for (var i=1; i < chunks.length; i++) {
			compressed.set(chunks[i], written);
			written += chunks[i].length;
		}

		callback(null, {raw: ab, compressed: compressed, path: path});
	}
};

/**
 * Add a file as Buffer to the ZIP (with path)
 * @param buffer Buffer The data from the file
 * @param path String The path of the file
 * @param callback Function The function to call when ready
 */
guidoZip.prototype.addBuffer = function(buffer, path, callback) {
	this.addArrayBuffer(this.b2ab(buffer), path, callback);
};

/**
 * Add a file as ArrayBuffer to the ZIP (with path)
 * @param buffer ArrayBuffer The data from the file
 * @param path String The path of the file
 * @param callback Function The function to call when ready
 */
guidoZip.prototype.addArrayBuffer = function(ab, path, callback) {
	// Check if we need to create entries for any parent dir
	var parts = path.split("/");
	var parts_tmp = [];
	if (parts.length > 1) {
		for (var i=0; i < parts.length-1; i++) {
			parts_tmp.push(parts[i]);

			if ((parts[i] == '.') || (parts[i] == '..'))
				continue;

			// Create the upstream path, check if we have an entry for it
			var path_tmp = parts_tmp.join("/");
			path_tmp += "/";

			var needs_entry = true;
			for (var j=0; j < this.files.length; j++) {
				if (this.files[j].filename == path_tmp) {
					needs_entry = false;
					break;
				}
			}

			if (needs_entry) {
				var entry = {};
				entry.filename = path_tmp;
				entry.deflate = new ArrayBuffer(0);
				entry.loc = this.createLoc(path_tmp, 0, 0, 0);
				entry.cd = this.createCd(path_tmp, 0, 0, 0, this.loc_offset);
				this.files.push(entry);
				this.loc_offset += entry.loc.byteLength;
			}
		}
	}

	if (! ab) {
		if (typeof callback == 'function')
			callback();
		return;
	}

	// DEFLATE it
	var self = this;
	this.deflate(ab, path, function(error, result) {
		if (error) 
			return callback(error);

		// CRC32
		var crc32 = self.crc32(result.raw);

		// If deflated size is bigger than original, use the original file and STORE method
		// (otherwise some unzippers get confused why compressed size is bigger)
		var data = (result.compressed.byteLength < result.raw.byteLength) ? result.compressed : result.raw;

		var entry = {
			filename: result.path,
			deflate: data,
			loc: self.createLoc(path, crc32, data.byteLength, result.raw.byteLength),
			cd: self.createCd(path, crc32, data.byteLength, result.raw.byteLength, self.loc_offset)
		};

		// Push the object to the array
		self.files.push(entry);

		// Save the offset at which the next file will begin
		self.loc_offset += entry.loc.byteLength + data.byteLength;			
		
		// Invoke the callback if such was supplied
		if (typeof callback == 'function')
			callback();
	});
};

/**
 * Get the ZIP file as an ArrayBuffer
 * @returns ArrayBuffer The ZIP file
 */
guidoZip.prototype.getArrayBuffer = function() {
	var cd_size = 0;
	var total_size = 0;
	var i = 0;

	// Calculate sizes
	for (i=0; i < this.files.length; i++) {
		cd_size += this.files[i].cd.byteLength;
		total_size += this.files[i].cd.byteLength + this.files[i].loc.byteLength + this.files[i].deflate.byteLength;
	} 

	// Prepare EOCD record
	var eocd = this.createEocd(this.files.length, cd_size, this.loc_offset);

	total_size += eocd.byteLength;

	// Assemble the LOC headers and compressed data
	var output = new ArrayBuffer(total_size);
	var outputU8A = new Uint8Array(output);
	var written = 0;
	for (i=0; i < this.files.length; i++) {
		outputU8A.set(new Uint8Array(this.files[i].loc), written);
		written += this.files[i].loc.byteLength;

		outputU8A.set(new Uint8Array(this.files[i].deflate), written);
		written += this.files[i].deflate.byteLength;
	}

	// Next, assemble the CD records
	for (i=0; i < this.files.length; i++) {
		outputU8A.set(new Uint8Array(this.files[i].cd), written);
		written += this.files[i].cd.byteLength;
	}

	// Finally, append the EOCD record
	outputU8A.set(new Uint8Array(eocd), written);

	return output;
};

/**
 * Create LOC header for a compressed file inside the ZIP. 
 * @param filename String The filename (with absolute or relative path),
 * @param crc32 String The CRC32 checksum of the uncompressed data.
 * @param compressed int The size of the compressed data.
 * @param uncompressed int The size of the uncompressed data.
 * @returns ArrayBuffer The LOC header.
 */
guidoZip.prototype.createLoc = function (filename, crc32, compressed, uncompressed) {
	// Prepare filename; encoded value is Uint8Array
	var te = new TextEncoder();
	var encoded = te.encode(filename);

	var loc = new ArrayBuffer(30 + encoded.buffer.byteLength);
	var dv = new DataView(loc);

	// NB! All writes are Little-Endian as per the ZIP specification!

	// 4 bytes: Local file header signature = 0x04034b50 (write as little-endian)
	dv.setUint8(0, 80);
	dv.setUint8(1, 75);
	dv.setUint8(2, 3);
	dv.setUint8(3, 4);

	// 2 bytes: Version needed to extract (minimum) - set to 0x14 (this is a mapping)
	dv.setUint16(4, 20, true);

	// 2 bytes: General purpose bit flag - set to 0
	dv.setUint16(6, 0, true);

	// 2 bytes: Compression method - set to 8 (DEFLATE)
	(compressed < uncompressed) ? dv.setUint16(8, 8, true) : dv.setUint16(8, 0, true);

	// 4 bytes: date and time in ZIP's specific format
	var date = this.formatDate(new Date());
	dv.setUint32(10, date, true);

	// 4 bytes: CRC-32
	dv.setUint32(14, crc32, true);

	// 4 bytes: Compressed size
	dv.setUint32(18, compressed, true);

	// 4 bytes: Uncompressed size
	dv.setUint32(22, uncompressed, true);

	// 2 bytes: Filename length N bytes
	dv.setUint16(26, filename.length, true);

	// 2 bytes: Extra field length - set to 0
	dv.setUint16(28, 0), true;

	// N bytes: Filename - set to filename
	var dve = new DataView(encoded.buffer);
	for (var i=0; i < encoded.buffer.byteLength; i++)
		dv.setUint8(30 + i, dve.getUint8(i));

	return loc;
};
	
/**
 * Create CD entry for a compressed file inside the ZIP. 
 * @param filename String The filename (with absolute or relative path),
 * @param crc32 String The CRC32 checksum of the uncompressed data.
 * @param compressed int The size of the compressed data.
 * @param uncompressed int The size of the uncompressed data.
 * @param loc_offset int The offset (in bytes) in which the LOC header for this file starts. 
 * @returns ArrayBuffer The CD entry.
 */

guidoZip.prototype.createCd = function(filename, crc32, compressed, uncompressed, loc_offset) {
	// Prepare filename; encoded value is Uint8Array
	var te = new TextEncoder();
	var encoded = te.encode(filename);

	var cd = new ArrayBuffer(46 + encoded.buffer.byteLength);
	var dv = new DataView(cd);

	// NB! All writes are Little-Endian as per the ZIP specification!

	// 4 bytes: Local file header signature = 0x02014b50 (write as little-endian)
	dv.setUint8(0, 80);
	dv.setUint8(1, 75);
	dv.setUint8(2, 1);
	dv.setUint8(3, 2);
		
	// 2 bytes: Version made by - set to 0x14 (this is a mapping)
	dv.setUint16(4, 20, true);
		
	// 2 bytes: Version needed to extract (minimum) - set to 0x14 (this is a mapping)
	dv.setUint16(6, 20, true);
		
	// 2 bytes: General purpose bit flag - set to 0
	dv.setUint16(8, 0, true);

	// 2 bytes: Compression method - set to 8 (DEFLATE)
	(compressed < uncompressed) ? dv.setUint16(10, 8, true) : dv.setUint16(10, 0, true);
		
	// 4 bytes: date and time in ZIP's specific format
	var date = this.formatDate(new Date());
	dv.setUint32(12, date, true);
		
	// 4 bytes: CRC-32
	dv.setUint32(16, crc32, true);

	// 4 bytes: Compressed size
	dv.setUint32(20, compressed, true);

	// 4 bytes: Uncompressed size
	dv.setUint32(24, uncompressed, true);
		
	// 2 bytes: Filename length N bytes
	dv.setUint16(28, filename.length, true);
		
	// 2 bytes: Extra field length - set to 0
	dv.setUint16(30, 0, true);
		
	// 2 bytes: File comment length - set to 0
	dv.setUint16(32, 0, true);

	// 2 bytes: Disk number where file starts - set to 0
	dv.setUint16(34, 0, true);

	// 2 bytes: Internal file attributes - set to 0
	dv.setUint16(36, 0, true);

	// 4 bytes: External file attributes - set to 0
	dv.setUint32(38, 0, true);

	// 4 bytes: Relative offset of LOC local file header counted from the beginning of ZIP file
	dv.setUint32(42, loc_offset, true);
		
	// N bytes: Filename - set to filename
	var dve = new DataView(encoded.buffer);
	for (var i=0; i < encoded.buffer.byteLength; i++)
		dv.setUint8(46 + i, dve.getUint8(i));

	return cd;
};
	
/**
 * Create the OECD record.
 * @param count int The number of CD entries.
 * @param size int The size (in bytes) of the CD
 * @param cd_offset int The offset (in bytes) from the beginning of the ZIP file where CD starts. 
 * @returns ArrayBuffer the EOCD entry.
 */
guidoZip.prototype.createEocd = function(count, size, cd_offset) {
	var eocd = new ArrayBuffer(22);
	var dv = new DataView(eocd);

	// NB! All writes are Little-Endian as per the ZIP specification!

	// 4 bytes: Central directory file header signature = 0x06054b50 (write as little-endian)
	dv.setUint8(0, 80);
	dv.setUint8(1, 75);
	dv.setUint8(2, 5);
	dv.setUint8(3, 6);

	// 2 bytes: Number of this disk - set to 0
	dv.setUint16(4, 0, true);

	// 2 bytes: Disk where central directory starts - set to 0
	dv.setUint16(6, 0, true);

	// 2 bytes: Number of central directory records on this disk
	dv.setUint16(8, count, true);

	// 2 bytes: Total number of central directory records - set to same as above
	dv.setUint16(10, count, true);

	// 4 bytes: Size of central directory (in bytes)
	dv.setUint32(12, size, true);

	// 4 bytes: Offset of start of central directory, relative to start of ZIP file
	dv.setUint32(16, cd_offset, true);

	// 2 bytes: Comment length - set to 0
	dv.setUint16(20, 0, true);

	return eocd;
};
	
/**
 * Helper function to format the date and time as per the ZIP specification.
 * @param date Date Existing date object.
 * @returns int Integer, corresponding to the input date as per the ZIP specification. 
 */
guidoZip.prototype.formatDate = function(date) {
	var d = 
		(date.getFullYear() - 1980 & 0x7f) << 25 
		| (date.getMonth() + 1) << 21
		| date.getDate() << 16
		| date.getHours() << 11
		| date.getMinutes() << 5
		| date.getSeconds >> 1;
	return d;
};

/**
 * Function which populates the CRC32 checksum table (avoid listing it as static)
 * @returns Array Populated CRC32 checksum table.
 */
guidoZip.prototype.makeCrcTable = function(){
	var crc_table = [];
	var c;
	for(var n =0; n < 256; n++){
		c = n;
            
		for(var k =0; k < 8; k++)
			c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));

		crc_table[n] = c;
	}
        
	return crc_table;
};

/**
 * Function which calculates the CRC32 checksum for a buffer
 * @buffer ArrayBuffer The buffer to calculate the checksum for.
 * @returns Int The CRC32 checksum for the buffer.
 */
guidoZip.prototype.crc32 = function(ab) {
	var crc = 0 ^ (-1);

	var dv = new DataView(ab);
	for (var i = 0; i < ab.byteLength; i++ )
		crc = (crc >>> 8) ^ this.crc_table[(crc ^ dv.getUint8(i)) & 0xFF];

	return (crc ^ (-1)) >>> 0;		
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
	module.exports = guidoZip;

