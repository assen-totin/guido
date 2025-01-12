// OOXML exporter for simple spreadsheets

/*
File structure:

/docProps
	core.xml
/_rels
/xl
	/_rels
		workbook.xml.rels
	/worksheets
		sheet1.xml
	sharedStrings.xml
	styles.xml
	workbook.xml
[Content_Types].xml
*/

var guidoOOXML = function (type, data, styles, callback) {
	// XML Header
	var xmlHeader = function(params) {
		this.version = (params && params.version) ? params.version : '1.0';
		this.encoding = (params && params.encoding) ? params.encoding : 'UTF-8';
		this.standalone = (params && params.standalone) ? params.standalone : 'yes';

		this.xml = function() {
			var ret = '<?xml';
			ret += ' version="' + this.version + '"';
			ret += ' encoding="' + this.encoding + '"';
			ret += ' standalone="' + this.standalone + '"';
			ret += '?>';

			return ret;
		}
	};

	// XML Element
	var xmlElement = function(name, value) {
		this.name = name;
		this.properties = [];
		this.value = (value != undefined) ? value : null;
		this.children = [];

		this.xml = function() {
			var ret = '<';

			ret += this.name;

			for (var i=0; i < this.properties.length; i++) {
				ret += ' ';
				ret += this.properties[i].xml();
			}

			if ((this.value != null) || this.children.length) {
				ret += '>';
				if (this.value != null)
					ret += this.value;
				}

			for (var i=0; i < this.children.length; i++)
				ret += this.children[i].xml();

			if ((this.value != null) || this.children.length)
				ret += '</' + this.name + '>';
			else
				ret += '/>';

			return ret;
		}
	};

	// XML Property
	var xmlProperty = function(name, value) {
		this.name = name;
		this.value = (value != null) ? value : null;

		this.xml = function() {
			var ret = '';
			ret += this.name;
			ret += (this.value != null) ? '="' + this.value + '"' : '';

			return ret;
		};
	};

	// [Content_Types.xml]
	var fileContentTypesXml = function() {
		var header = new xmlHeader();

		var Types = new xmlElement('Types');
		Types.properties.push(new xmlProperty('xmlns', 'http://schemas.openxmlformats.org/package/2006/content-types'));

		var Default1 = new xmlElement('Default');
		Default1.properties.push(new xmlProperty('ContentType', 'application/xml'));
		Default1.properties.push(new xmlProperty('Extension', 'xml'));
		Types.children.push(Default1);

		var Default2 = new xmlElement('Default');
		Default2.properties.push(new xmlProperty('ContentType', 'application/vnd.openxmlformats-package.relationships+xml'));
		Default2.properties.push(new xmlProperty('Extension', 'rels'));
		Types.children.push(Default2);

		var Override1 = new xmlElement('Override');
		Override1.properties.push(new xmlProperty('ContentType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'));
		Override1.properties.push(new xmlProperty('PartName', '/xl/workbook.xml'));
		Types.children.push(Override1);

		var Override2 = new xmlElement('Override');
		Override2.properties.push(new xmlProperty('ContentType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'));
		Override2.properties.push(new xmlProperty('PartName', '/xl/worksheets/sheet1.xml'));
		Types.children.push(Override2);

		var Override3 = new xmlElement('Override');
		Override3.properties.push(new xmlProperty('ContentType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'));
		Override3.properties.push(new xmlProperty('PartName', '/xl/styles.xml'));
		Types.children.push(Override3);

		var Override4 = new xmlElement('Override');
		Override4.properties.push(new xmlProperty('ContentType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml'));
		Override4.properties.push(new xmlProperty('PartName', '/xl/sharedStrings.xml'));
		Types.children.push(Override4);

		var Override5 = new xmlElement('Override');
		Override5.properties.push(new xmlProperty('ContentType', 'application/vnd.openxmlformats-package.core-properties+xml'));
		Override5.properties.push(new xmlProperty('PartName', '/docProps/core.xml'));
		Types.children.push(Override5);

		return header.xml() + Types.xml();
	};

	// docProps/core.xml
	var fileDocPropsCoreXml = function() {
		var header = new xmlHeader();

		var coreProperties = new xmlElement('cp:coreProperties');
		coreProperties.properties.push(new xmlProperty('xmlns:cp', 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'));
		coreProperties.properties.push(new xmlProperty('xmlns:dc', 'http://purl.org/dc/elements/1.1/'));
		coreProperties.properties.push(new xmlProperty('xmlns:dcterms', 'http://purl.org/dc/terms/'));
		coreProperties.properties.push(new xmlProperty('xmlns:dcmitype', 'http://purl.org/dc/dcmitype/'));
		coreProperties.properties.push(new xmlProperty('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance'));

		coreProperties.children.push(new xmlElement('dc:creator', 'GUIdo Web Framework'));
		coreProperties.children.push(new xmlElement('cp:lastModifiedBy', 'GUIdo Web Framework'));

		var now = new Date();

		var created = new xmlElement('dcterms:created', now.toISOString());
		created.properties.push(new xmlProperty('xsi:type', 'dcterms:W3CDTF'));
		coreProperties.children.push(created);

		var modified = new xmlElement('dcterms:modified', now.toISOString());
		modified.properties.push(new xmlProperty('xsi:type', 'dcterms:W3CDTF'));
		coreProperties.children.push(modified);

		return header.xml() + coreProperties.xml();
	};

	// _rels directory
	var fileRelsRels = function() {
		var header = new xmlHeader();

		var Relationships = new xmlElement('Relationships');
		Relationships.properties.push(new xmlProperty('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships'));

		var Relationship1 = new xmlElement('Relationship');
		Relationship1.properties.push(new xmlProperty('Id', 'rId1'));
		Relationship1.properties.push(new xmlProperty('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument'));
		Relationship1.properties.push(new xmlProperty('Target', 'xl/workbook.xml'));
		Relationships.children.push(Relationship1);

		var Relationship2 = new xmlElement('Relationship');
		Relationship2.properties.push(new xmlProperty('Id', 'rId2'));
		Relationship2.properties.push(new xmlProperty('Type', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties'));
		Relationship2.properties.push(new xmlProperty('Target', 'docProps/core.xml'));
		Relationships.children.push(Relationship2);

		return header.xml() + Relationships.xml();
	};

	// xl/_rels/workbook.xml.rels
	var fileXlRelsWorkbookXmlRels = function() {
		var header = new xmlHeader();

		var Relationships = new xmlElement('Relationships');
		Relationships.properties.push(new xmlProperty('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships'));

		var Relationship1 = new xmlElement('Relationship');
		Relationship1.properties.push(new xmlProperty('Id', 'rId2'));
		Relationship1.properties.push(new xmlProperty('Target', 'sharedStrings.xml'));
		Relationship1.properties.push(new xmlProperty('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings'));
		Relationships.children.push(Relationship1);

		var Relationship2 = new xmlElement('Relationship');
		Relationship2.properties.push(new xmlProperty('Id', 'rId3'));
		Relationship2.properties.push(new xmlProperty('Target', 'styles.xml'));
		Relationship2.properties.push(new xmlProperty('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles'));
		Relationships.children.push(Relationship2);

		var Relationship3 = new xmlElement('Relationship');
		Relationship3.properties.push(new xmlProperty('Id', 'rId1'));
		Relationship3.properties.push(new xmlProperty('Target', 'worksheets/sheet1.xml'));
		Relationship3.properties.push(new xmlProperty('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'));
		Relationships.children.push(Relationship3);

		return header.xml() + Relationships.xml();
	};

	// xl/worksheets/sheet1.xml
	var fileXlWorksheetsSheet1Xml = function(data) {
	//	var header = new xmlHeader();

		var worksheet = new xmlElement('worksheet');
		worksheet.properties.push(new xmlProperty('mc:Ignorable', 'x14ac'));
		worksheet.properties.push(new xmlProperty('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'));
		worksheet.properties.push(new xmlProperty('xmlns:mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006'));
		worksheet.properties.push(new xmlProperty('xmlns:r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'));
		worksheet.properties.push(new xmlProperty('xmlns:x14ac', 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac'));

		// Get dimensions
		var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		var ref = 'A1:' + letters.substring(data.header.length - 1, data.header.length) + (data.rows.length + 1);
		var dimension = new xmlElement('dimension');
		dimension.properties.push(new xmlProperty('ref', ref));
		worksheet.children.push(dimension);

		var sheetViews = new xmlElement('sheetViews');
		var sheetView = new xmlElement('sheetView');
		sheetView.properties.push(new xmlProperty('showGridLines', 1));
		sheetView.properties.push(new xmlProperty('workbookViewId', 0));
		sheetView.properties.push(new xmlProperty('rightToLeft', 0));
		sheetView.properties.push(new xmlProperty('zoomScale', 100));
		sheetView.properties.push(new xmlProperty('zoomScaleNormal', 100));
		sheetView.properties.push(new xmlProperty('zoomScalePageLayoutView', 100));
		sheetViews.children.push(sheetView);
		worksheet.children.push(sheetViews);

		var sheetFormatPr = new xmlElement('sheetFormatPr');
		sheetFormatPr.properties.push(new xmlProperty('baseColWidth', 10));
		sheetFormatPr.properties.push(new xmlProperty('defaultRowHeight', 16));
		worksheet.children.push(sheetFormatPr);

		var sheetData = new xmlElement('sheetData');
		var count = 0;

		// Header
		var row = new xmlElement('row');
		row.properties.push(new xmlProperty('r', 1));
		row.properties.push(new xmlProperty('spans', '1:' + data.header.length));

		for (var i=0; i < data.header.length; i++) {
			var c = new xmlElement('c');
			c.properties.push(new xmlProperty('r', letters.substring(i, i+1) + 1));
			c.properties.push(new xmlProperty('s', 0));
			c.properties.push(new xmlProperty('t', 's'));

			var v = new xmlElement('v', count);
			c.children.push(v);
			row.children.push(c);

			count++;
		}
		sheetData.children.push(row);

		// Rows
		for (var i=0; i < data.rows.length; i++) {
			var row = new xmlElement('row');
			row.properties.push(new xmlProperty('r', i+2));
			row.properties.push(new xmlProperty('spans', '1:' + data.header.length));

			for (var j=0; j < data.rows[i].length; j++) {
				var c = new xmlElement('c');
				c.properties.push(new xmlProperty('r', letters.substring(j, j+1) + (i+2)));
				c.properties.push(new xmlProperty('s', 1));
				c.properties.push(new xmlProperty('t', 's'));

				var v = new xmlElement('v', count);
				c.children.push(v);
				row.children.push(c);

				count++;
			}

			sheetData.children.push(row);
		}
		worksheet.children.push(sheetData);

		var pageMargins = new xmlElement('pageMargins');
		pageMargins.properties.push(new xmlProperty('left', 1));
		pageMargins.properties.push(new xmlProperty('right', 1));
		pageMargins.properties.push(new xmlProperty('top', 1));
		pageMargins.properties.push(new xmlProperty('bottom', 1));
		pageMargins.properties.push(new xmlProperty('header', 0.5));
		pageMargins.properties.push(new xmlProperty('footer', 0.5));
		worksheet.children.push(pageMargins);

		return worksheet.xml();
	};

	// xl/sharedStrings.xml
	var fileXlSharedStringsXml = function(data) {
		var header = new xmlHeader();

		var sst = new xmlElement('sst');
		sst.properties.push(new xmlProperty('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'));

		var count = 0;

		// Header
		for (var i=0; i < data.header.length; i++) {
			count ++;
			var si = new xmlElement('si');
			var t = new xmlElement('t', data.header[i]);
			si.children.push(t);
			sst.children.push(si);
		}

		// Rows: strip any HTML/XML tags that might be in the value
		var re = /<.+?>/g;
		for (var i=0; i < data.rows.length; i++) {
			for (var j=0; j < data.rows[i].length; j++) {
				count ++;
				var si = new xmlElement('si');
				var t = new xmlElement('t', data.rows[i][j].toString().replaceAll(re, ''));
				si.children.push(t);
				sst.children.push(si);
			}
		}

		sst.properties.push(new xmlProperty('count', count));
		sst.properties.push(new xmlProperty('uniqueCount', count));

		return header.xml() + sst.xml();
	};

	// xl/styles.xml
	var fileXlStylesXml = function(styles) {
		var defaults = {
			header: {
				font: {
					b: true,
					i: false,
					sz: 12,
					color: 'FF000000',
					name: 'Calibri'
				},
			},
			rows : {
				font: {
					b: false,
					i: false,
					sz: 12,
					color: 'FF000000',
					name: 'Calibri'
				},
			},
		};

		var mergeStyle = function (def, cust) {
			var res = {};
			var keysDef = Object.keys(cust);
			for (var i=0; i < keysDef.length; i++)
				res[keysDef[i]] = cust[keysDef[i]];
			var keysCust = Object.keys(cust);
			for (var i=0; i < keysCust.length; i++)
				res[keysCust[i]] = cust[keysCust[i]];
			return res;
		};

		var mergeStyles = function(def, cust) {
			var res = {
				header:{
					font: (cust && cust.header && cust.header.font) ? mergeStyle(def.header.font, cust.header.font) : def.header.font,
				},
				rows: {
					font: (cust && cust.rows && cust.rows.font) ? mergeStyle(def.rows.font, cust.rows.font) : def.rows.font,
				}
			};
			return res;
		};

		var mergedStyles = mergeStyles(defaults, styles);

		var header = new xmlHeader();

		var styleSheet = new xmlElement('styleSheet');
		styleSheet.properties.push(new xmlProperty('mc:Ignorable', 'x14ac'));
		styleSheet.properties.push(new xmlProperty('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'));
		styleSheet.properties.push(new xmlProperty('xmlns:mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006'));
		styleSheet.properties.push(new xmlProperty('xmlns:x14ac', 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac'));

		var numFmts = new xmlElement('numFmts');
		numFmts.properties.push(new xmlProperty('count', 1));
		var numFmt = new xmlElement('numFmt');
		numFmt.properties.push(new xmlProperty('formatCode', '$#,##0.00; ($#,##0.00); -'));
		numFmt.properties.push(new xmlProperty('numFmtId', '164'));
		numFmts.children.push(numFmt);
		styleSheet.children.push(numFmts);

		var fonts = new xmlElement('fonts');
		fonts.properties.push(new xmlProperty('count', 2));

		// Header font
		var fontH = new xmlElement('font');

		var bH = new xmlElement('b');
		fontH.children.push(bH);
		if (mergedStyles.header.font.i) {
			var iH = new xmlElement('i');
			fontH.children.push(iH);
		}
		var szH = new xmlElement('sz');
		szH.properties.push(new xmlProperty('val', mergedStyles.header.font.sz));
		fontH.children.push(szH);
		var colourH = new xmlElement('color');
		colourH.properties.push(new xmlProperty('rgb', mergedStyles.header.font.color));
		fontH.children.push(colourH);
		var nameH = new xmlElement('name');
		nameH.properties.push(new xmlProperty('val', mergedStyles.header.font.name));
		fontH.children.push(nameH);
		var familyH = new xmlElement('family');
		familyH.properties.push(new xmlProperty('val', 1));
		fontH.children.push(familyH);
		fonts.children.push(fontH);

		// Rows font
		var fontR = new xmlElement('font');
		if (mergedStyles.rows.font.b) {
			var bR = new xmlElement('b');
			fontR.children.push(bR);
		}
		if (mergedStyles.rows.font.i) {
			var iR = new xmlElement('i');
			fontR.children.push(iR);
		}
		var szR = new xmlElement('sz');
		szR.properties.push(new xmlProperty('val', mergedStyles.rows.font.sz));
		fontR.children.push(szR);
		var colorR = new xmlElement('color');
		colorR.properties.push(new xmlProperty('rgb', mergedStyles.rows.font.color));
		fontR.children.push(colorR);
		var nameR = new xmlElement('name');
		nameR.properties.push(new xmlProperty('val', mergedStyles.rows.font.name));
		fontR.children.push(nameR);
		var familyR = new xmlElement('family');
		familyR.properties.push(new xmlProperty('val', 1));
		fontR.children.push(familyR);
		fonts.children.push(fontR);

		styleSheet.children.push(fonts);

		var fills = new xmlElement('fills');
		fills.properties.push(new xmlProperty('count', 2));
		var fill = new xmlElement('fill');
		var patternFill = new xmlElement('patternFill');
		patternFill.properties.push(new xmlProperty('patternType', 'none'));
		fill.children.push(patternFill);
		fills.children.push(fill);
		styleSheet.children.push(fills);

		var borders = new xmlElement('borders');
		borders.properties.push(new xmlProperty('count', 1));
		var border = new xmlElement('border');
		border.children.push(new xmlElement('left'));
		border.children.push(new xmlElement('right'));
		border.children.push(new xmlElement('top'));
		border.children.push(new xmlElement('bottom'));
		border.children.push(new xmlElement('diagonal'));
		borders.children.push(border);
		styleSheet.children.push(borders);

		var cellStyleXfs = new xmlElement('cellStyleXfs');
		cellStyleXfs.properties.push(new xmlProperty('count', 2));

		// Header cells
		var xf1 = new xmlElement('xf');
		xf1.properties.push(new xmlProperty('numFmtId', 0));
		xf1.properties.push(new xmlProperty('fontId', 0));
		xf1.properties.push(new xmlProperty('fillId', 0));
		xf1.properties.push(new xmlProperty('borderId', 0));
		xf1.properties.push(new xmlProperty('applyFont', true));
		xf1.properties.push(new xmlProperty('applyBorder', false));
		xf1.properties.push(new xmlProperty('applyAlignment', false));
		xf1.properties.push(new xmlProperty('applyProtection', false));
		cellStyleXfs.children.push(xf1);

		// Row cells
		var xf2 = new xmlElement('xf');
		xf2.properties.push(new xmlProperty('numFmtId', 0));
		xf2.properties.push(new xmlProperty('fontId', 1));
		xf2.properties.push(new xmlProperty('fillId', 0));
		xf2.properties.push(new xmlProperty('borderId', 0));
		xf2.properties.push(new xmlProperty('applyFont', true));
		xf2.properties.push(new xmlProperty('applyBorder', false));
		xf2.properties.push(new xmlProperty('applyAlignment', false));
		xf2.properties.push(new xmlProperty('applyProtection', false));
		cellStyleXfs.children.push(xf2);

		styleSheet.children.push(cellStyleXfs);

		var cellXfs = new xmlElement('cellXfs');
		cellXfs.properties.push(new xmlProperty('count', 2));

		// Header cells
		var xf3 = new xmlElement('xf');
		xf3.properties.push(new xmlProperty('applyFont', 1));
		xf3.properties.push(new xmlProperty('fontId', 0));
		cellXfs.children.push(xf3);

		// Row cells
		var xf4 = new xmlElement('xf');
		xf4.properties.push(new xmlProperty('applyFont', 1));
		xf4.properties.push(new xmlProperty('fontId', 1));
		xf4.properties.push(new xmlProperty('applyNumberFormat', 1));
		xf4.properties.push(new xmlProperty('numFmtId', 164));
		cellXfs.children.push(xf4);

		styleSheet.children.push(cellXfs);

		var cellStyles = new xmlElement('cellStyles');
		cellStyles.properties.push(new xmlProperty('count', 2));

		// Header cells
		var cellStyle1 = new xmlElement('cellStyle');
		cellStyle1.properties.push(new xmlProperty('name', 'Header'));
		cellStyle1.properties.push(new xmlProperty('xfId', 0));
		cellStyle1.properties.push(new xmlProperty('builtinId', 0));
		cellStyles.children.push(cellStyle1);

		// Row cells
		var cellStyle2 = new xmlElement('cellStyle');
		cellStyle2.properties.push(new xmlProperty('name', 'Row'));
		cellStyle2.properties.push(new xmlProperty('xfId', 1));
		cellStyle2.properties.push(new xmlProperty('builtinId', 1));
		cellStyles.children.push(cellStyle2);

		styleSheet.children.push(cellStyles);

		return header.xml() + styleSheet.xml();
	};

	// xl/workbook.xml
	var fileXlWorkbookXml = function() {
		var header = new xmlHeader();

		var workbook = new xmlElement('workbook');
		workbook.properties.push(new xmlProperty('mc:Ignorable', 'x15'));
		workbook.properties.push(new xmlProperty('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'));
		workbook.properties.push(new xmlProperty('xmlns:mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006'));
		workbook.properties.push(new xmlProperty('xmlns:r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'));
		workbook.properties.push(new xmlProperty('xmlns:x15', 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/main'));

		var bookViews = new xmlElement('bookViews');
		var workbookView = new xmlElement('workbookView');
		bookViews.children.push(workbookView);
		workbook.children.push(bookViews);

		var sheets = new xmlElement('sheets');
		var sheet = new xmlElement('sheet');
		sheet.properties.push(new xmlProperty('name', 'Sheet 1'));
		sheet.properties.push(new xmlProperty('sheetId', 1));
		sheet.properties.push(new xmlProperty('r:id', 'rId1'));
		sheets.children.push(sheet);
		workbook.children.push(sheets);

		return header.xml() + workbook.xml();
	};

	var fileEmpty = function() {
		return '';
	};

	////// MAIN ENRTY POINT

	var zip = new guidoZip();

	var sync = new guidoSync(function(){
		callback(null, zip.getArrayBuffer());
	});

	var files;
	switch(type) {
		case 'xls':
			files = [
				{func: fileContentTypesXml, path: '[Content_Types].xml'},
				{func: fileDocPropsCoreXml, path: 'docProps/core.xml'},
				{func: fileXlRelsWorkbookXmlRels, path: 'xl/_rels/workbook.xml.rels'},
				{func: fileXlStylesXml, path: 'xl/styles.xml', args: styles},
				{func: fileXlWorkbookXml, path: 'xl/workbook.xml'},
				{func: fileXlSharedStringsXml, path: 'xl/sharedStrings.xml', args: data},
				{func: fileXlWorksheetsSheet1Xml, path: 'xl/worksheets/sheet1.xml', args: data},
				{func: fileRelsRels, path: '_rels/.rels'},
			];
			break;

		default: 
			console.log("Unknown type: " + type);
	}

	for (var i=0; i < files.length; i++) {
		sync.inc();
		var res = files[i]['func'](files[i].args);

		// create ArrayBuffer from String
		var ab = null;
		if (res) {
			var encoder = new TextEncoder();
			var u8a = encoder.encode(res);
			ab = u8a.buffer;
		}

		zip.addArrayBuffer(ab, files[i].path, function(error){
			if (error)
				console.log(error);
			sync.dec();
		});
	}
};

