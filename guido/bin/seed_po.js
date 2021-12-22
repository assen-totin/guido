// Make a copy of a PO file, populating msgstr values from another PO file.
// Result is written to STDOUT.

var fs = require('fs');

// Define the source (where to read from) and target (where to replace to) files
var fileSrc = 'de_DE.po.src';
var fileDst = 'de_DE.po.dst';

// Load source strings
var dataSrc = fs.readFileSync(fileSrc, 'UTF-8');
var linesSrc = dataSrc.split(/\r?\n/);

// Load target strings
var dataDst = fs.readFileSync(fileDst, 'UTF-8');
var linesDst = dataDst.split(/\r?\n/);

// Loop around target strings and print them, for each msgid cheking all source strings;
// on match, print the next line from the source; on miss, print the next line from the target
var found = false;
for (var i=0; i < linesDst.length; i++) {
	// If previous msgid had a match, the msgstr from the source had already be printed, so skip this line
	if (! found)
		console.log(linesDst[i]);

	// Seek a match on msgid from the source and print the next (msgsrt) line from it
	found = false;	
	for (var j=0; j < linesSrc.length; j++) {
		if (linesSrc[j].indexOf('msgid') < 0)
			continue;

		if (linesSrc[j] == linesDst[i]) {
			console.log(linesSrc[j + 1]);
			found = true;
			break;
		}
	}
}

