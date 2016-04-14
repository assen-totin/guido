var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');

// We read the web server config from the app package
var config = require('../../app/conf/webserver.conf.js');
var Logger = require('../js/logger');
var logger = new Logger(config.logger);

// Try to get GUIdo config for current app; if not available, set defaults
var cookieName;
try {
	var guidoConf = require('../../app/conf/guidoConf');
	cookieName = guidoConf.cookie_f5;
}
catch (e) {
	cookieName = 'guido_f5';
}

// Set DocumentRoot - two directories higher
var documentRoot = path.resolve(__dirname, '..', '..');

// Main server code
var server = http.createServer(function(request, response) {
	logger.trace("Processing new request...");

	// Helper function: send a response to client
	var httpResponse = function(input) {
		response.statusCode = input.code ? input.code : 500;

		// Default headers to disable browser caching
		response.setHeader('Cache-control', "no-cache");
		response.setHeader('Cache-control', "no-store");
		response.setHeader('Pragma', "no-cache");
		response.setHeader('Expires', 0);

		// Custom headers
		if (input.headers) {
			var keys = Object.keys(input.headers);
			for (var i=0; i<keys.length; i++) {
				response.setHeader(keys[i], input.headers[keys[i]]);			
			}
		}

		// Send message
		if (input.fd) {
			var rs = fs.createReadStream(null, {fd: input.fd, flags: 'r'});
			rs.on('readable', function(){
				var chunk;
				while ((chunk = rs.read(1500)) !== null)
					response.write(chunk);
			});
			rs.on('end', function(){
				response.end();
			});
		}
		else if (input.msg) {
			response.setHeader('Content-type', 'text/plain');
			response.write(input.msg);
			response.end();
		}

		// Log message
		if (input.msg) {
			var msg = (typeof input.msg == 'object') ? JSON.stringify(input.msg) : input.msg;
			var logMsg = (input.error) ? msg + "\n" + input.error : msg;
			if ((response.statusCode >= 400) && (response.statusCode <= 499)) 
				logger.warning(logMsg);
			else if ((response.statusCode >= 500) && (response.statusCode <= 599)) 
				logger.error(logMsg);
			else
				logger.trace(logMsg);

			// HTTP Log entry
			logger.http('[RESPONSE]' + msg);
		}
	};

	// Helper function: Parse a URL string
	var parseUrl = function(input) {
		var parts;
		try {
			parts = url.parse(input, true);
			return parts;
		}
		catch (e) {
			httpResponse({code:400, msg:"URL failed to parse: " + input, error:e});
			return null;
		}
	};

	// Helper function to get index file
	var getIndex = function(dir) {
		var dir2;
		try { 
			dir2 = dir + "/index.html";
			stat = fs.lstatSync(dir);
			logger.debug('Found index.html in directory ' + dir);
		}
		catch(e) {
			try {
				dir2 = dir + "/index.htm";
				stat = fs.lstatSync(dir2);
				logger.debug('Found index.htm in directory ' + dir);
			}
			catch(e) {
				logger.debug('No index found in directory ' + dir);
				return null;
			}
		}
		return dir2;
	};

	// Helper function to get content type from a dir
	var getContentType = function(dir) {
		var partsDir = dir.split('/');
		var partsFile = partsDir[partsDir.length - 1].split('.');
		var extension = partsFile[partsFile.length - 1].toLowerCase();
		switch(extension) {
			case 'txt':
			case 'index':
				return 'text/plain';
			case 'htm':
			case 'html':
				return 'text/html';
			case 'css':
				return 'text/css';
			case 'js':
				return 'application/javascript';
			case 'zip':
				return 'application/zip';
			case 'jpg':
			case 'jpeg':
				return 'image/jpeg';
			case 'png':
				return 'image/png';
			case 'gif':
				return 'image/gif';
			case 'ico':
				return 'image/x-icon';
			case 'swf':
				return 'application/x-shockwave-flash';
			case 'woff':
				return 'application/x-font-woff';
			case 'otf':
				return 'font/opentype';
			case 'ttf':
				return 'font/ttf';
			default:
				return 'application/octet-stream';
		}
	}

	// MAIN ENTRY POINT

	// Check protocol version
	if ((request.httpVersion != '1.0') && (request.httpVersion != '1.1')) {
		httpResponse({code:505, msg:"HTTP version not supported: " + request.httpVersion});
		return;
	}

	// Parse URL
	var urlParts = parseUrl(request.url);
	if (! urlParts)
		return;

	// Make sure headers are all lower-case
	request.headersLowerCase = {};
	var headerKeys = Object.keys(request.headers);
	for (var i=0; i<headerKeys.length; i++) {
		var key = headerKeys[i].toLowerCase();
		request.headersLowerCase[key] = request.headers[headerKeys[i]];
	}

	// Log request to HTTP log
	var remoteAddress = (request.headersLowerCase['x-forwarded-for']) ? request.headersLowerCase['x-forwarded-for'] : request.connection.remoteAddress;
	logger.http('[' + remoteAddress + '][' + request.method + ']' + request.url);

	// Process input based on method
	switch(request.method) {
		case 'OPTIONS':
			// Handle them internally
			var resp = {
				code:200, 
				msg: "OPTIONS OK, go on!", 
				headers: {
					'Access-Control-Allow-Headers': 'X-Session-Id',
					'Access-Control-Allow-Methods': 'GET'
				}
			}
			httpResponse(resp);
			break;

		case 'GET':
			// Response object
			var resp = {};
			var cookie = null;

			// Compose file
			var file = documentRoot + urlParts.pathname;
			logger.debug('Looking up file ' + file);

			var stat;
			try {
				stat = fs.lstatSync(file);
				logger.debug('Got stat data for file ' + file);
			}
			catch (e) {
				logger.debug('Could not stat file ' + file);
				logger.debug('Returning redirect to index ');
				resp.code = 302;
				resp.headers = [],
				resp.headers['Location'] = '/index.html';
				resp.headers['Set-cookie'] = cookieName + '=' + urlParts.pathname + '; Path=/';
				if (urlParts.host) 
					resp.headers['Set-cookie'] += '; Domain=' + urlParts.host;
				resp.msg = "Moved";
				logger.debug('Returning cookie: ' + resp.headers['Set-cookie']);
				httpResponse(resp);
				return;
			}

			// Check if the file is a special file and reject it
			if (stat.isBlockDevice() || stat.isCharacterDevice() || stat.isFIFO() || stat.isSocket() || stat.isSymbolicLink()) {
				logger.debug('Special file detected, denying GET ' + file);
				resp.code = 404;
				resp.msg = "File type not allowed: " + urlParts.pathname;
				httpResponse(resp);
				return;
			}

			// Check if the file is directory and seek an index file
			if (stat.isDirectory()) {
				logger.debug('File is a directory, getting index ' + file);
				var file2 = getIndex(file);
				if (file2) {
					logger.debug('Got index from directory ' + file);
					file = file2;
				}
				else {
					logger.debug('Could not get index from directory ' + file);
					resp.code = 403;
					resp.msg = "Directory listing denied for " + file;
					httpResponse(resp);
					return;
				}
			}

			// Prepare response
			logger.debug('Serving file ' + file);
			resp.code = 200;
			resp.headers = [],
			resp.headers['Content-type'] = getContentType(file);
			if (cookie) 
				resp.headers['Set-cookie'] = cookie;
			resp.fd = fs.openSync(file, 'r');
			httpResponse(resp);

			break;

		default:
			resp.code = 405;
			resp.msg = "Unknown method: " + request.method
			httpResponse(resp);
	}
});

server.listen(config.http.port, config.http.host);
logger.notice("Started GUIdo web server on port " + config.http.port + " with DocumentRoot " + documentRoot);


