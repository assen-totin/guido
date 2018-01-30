/**
 * Constructor
 * 
 * @param params object Object to costruct the table from.
 * @param callback function Function to call after the validation; params (error, result) where result is the form data, ready to be submitted.
 */
var guidoTable = function(params, callback) {
	// Table name & ID
	this.id = params.id || 'T' + this.uuid4();	// Make sure we always start with a letter!
	this.name = params.name || this.id;

	// Store the callback
	this.callback = callback || null;

	// Table header object
	this.header = params.header || {};

	// Table rows array
	this.rows = params.rows || [];

	// Table CSS
	this.css = params.css || null;
	this.cssOdd = params.cssOdd || '';
	this.cssEven = params.cssEven || '';
	this.cssRows = params.cssRows || null;
	this.cssCells = params.cssCells || null;

	// Exec function(s)
	this.exec = params.exec || null;

	// Table sorting properties
	// The value for 'sort' should be the number of the column to sort by (leftmost column is 0)
	this.sort = (params.hasOwnProperty('sort')) ? params.sort : null;
	this.direction = params.direction || 'asc';
	this.comparator = params.comparator || null;
	this.sortControls = (params.hasOwnProperty('sortControls')) ? params.sortControls : null;

	// Table pagination properties
	this.page = params.page || 0;
	this.currentPage = 1;
	this.pageControls = params.pageControls || {position: ['bottom'], align: ['right']};

	// Instantiate our own logger
	this.logger = new guidoLogger({app_name: 'Tables'});
	if (params.logger && params.logger.log_level)
		this.logger.log_level = params.logger.log_level;
	else if (appRun && appRun.logger && appRun.logger.log_level)
		this.logger.log_level = appRun.logger.log_level;

	// Filter: disable if unspecified
	this.filter = params.filter || {};
	if (! this.filter.hasOwnProperty('enabled'))
		this.filter.enabled = false;
	if (! this.filter.hasOwnProperty('visible'))
		this.filter.visible = false;
	if (! this.filter.hasOwnProperty('css'))
		this.filter.css = '';

	// Header: create an ID if not assigned, enable columns if not specified, disable filter if not specified
	if (! this.header.hasOwnProperty('id'))
		this.header.id = 'tr' + this.uuid4();

	for (var i=0; i < this.header.cells.length; i++) {
		if (! this.header.cells[i].hasOwnProperty('id'))
			this.header.cells[i].id = 'td' + this.uuid4();
		if (! this.header.cells[i].hasOwnProperty('enabled'))
			this.header.cells[i].enabled = true;
		if (! this.header.cells[i].hasOwnProperty('filter'))
			this.header.cells[i].filter = {};
		if (! this.header.cells[i].filter.hasOwnProperty('id'))
			this.header.cells[i].filter.id = this.uuid4();
		if (! this.header.cells[i].filter.hasOwnProperty('enabled'))
			this.header.cells[i].filter.enabled = false;
		if (! this.header.cells[i].filter.hasOwnProperty('value'))
			this.header.cells[i].filter.value = '';
	}

	// Rows: create an ID if not supplied
	for (var i=0; i < this.rows.length; i++) {
		if (! this.rows[i].hasOwnProperty('id'))
			this.rows[i].id = 'tr' + this.uuid4();

		for (var j=0; j<this.rows[i].cells.length; j++) {
			if (! this.rows[i].cells[j].hasOwnProperty('id'))
				this.rows[i].cells[j].id = 'td' + this.uuid4();
		}
	}

	// Rows: Set default enabled
	if (! this.header.hasOwnProperty('enabled'))
		this.header.enabled = true;
	for (var i=0; i < this.rows.length; i++) {
		if (! this.rows[i].hasOwnProperty('enabled'))
			this.rows[i].enabled = true;
	}

	// Rows: attach per-row CSS if given
	if (this.cssRows) {
		for (var i=0; i < this.rows.length; i++)
			this.rows[i].css += ' ' + this.cssRows;
	}

	// Cells: attach cell CSS if given
	for (var i=0; i < this.rows.length; i++) {
		for (var j=0; j<this.rows[i].cells.length; j++)
			this.rows[i].cells[j].css += ' ' + this.cssCells;
	}

	// Register the table
	if (! appRun.tables)
		appRun.tables = {};
	appRun.tables[this.id] = this;

	// Render the form
	if (params.div) {
		this.div = params.div;
		this.render(this.div);
	}
};


/**
 * Render table
 */
guidoTable.prototype.render = function (div) {
	this.logger.debug("Entering function render() with sort, page " + this.sort + ',' + this.currentPage);

	this.rowIdx = 0;

	var html = '';

	if (div)
		this.div = div;

	// See if we need numeric or lexical sort
	// If comparator is given, always use it
	var method;
	if (this.hasOwnProperty('sort')) {
		if (this.comparator)
			method = 'custom';
		else {
			method = 'int';
			for (var i=0; i<this.rows.length; i++) {
				// Handle rowspan cells
				if (! this.rows[i].cells[this.sort])
					continue;

				if (this.rows[i].cells[this.sort].content !== parseInt(this.rows[i].cells[this.sort].content, 10)) {
					method = 'str';
					break;
				}
			}
		}

		var cmp = 0;

		for (var i=0; i<this.rows.length - 1; i++) {
			for (var j=0; j<this.rows.length - 1; j++) {
				// Handle rowspan cells
				if (! this.rows[j].cells[this.sort])
					continue;
				if (! this.rows[j+1].cells[this.sort])
					continue;

				switch(method) {
					case 'str':
						cmp = this.rows[j].cells[this.sort].content.localeCompare(this.rows[j+1].cells[this.sort].content);
						break;

					case 'int':
						if (this.rows[j].cells[this.sort].content == this.rows[j+1].cells[this.sort].content)
							cmp = 0;
						else
							cmp = (this.rows[j].cells[this.sort].content > this.rows[j+1].cells[this.sort].content) ? 1 : -1;
						break;

					case 'custom':
						cmp = this.comparator(this.rows[j].cells[this.sort].content, this.rows[j+1].cells[this.sort].content);
						break;
				}

				if ( ((this.direction == 'asc') && (cmp > 0)) || ((this.direction == 'desc') && (cmp < 0)) ){
					tmp = this.rows[j];
					this.rows[j] = this.rows[j+1];
					this.rows[j+1] = tmp;
				}
			}
		}
	}

	// Get pagination controls
	var htmlPage = this.getPageControls();

	// If we need pagination on top, show it (in a wrapping table)
	if (htmlPage) {
		html += '<table border=0 cellspacing=0 cellpadding=0 ';
		html += this.cssHtml(this.asArray(this.css));
		html += '>';
		for (var i=0; i<this.pageControls.position.length; i++) {
			if (this.pageControls.position[i] == 'top')
				 html += htmlPage;
		}
		html += '<tr><td colspan=2>';
	}

	// Prepape TABLE tag
	html += '<table name="' + this.name + '" id="' + this.id + '" ';

	html += this.cssHtml(this.asArray(this.css));

	html += '>';

	// Process header
	html += this.renderHeader();

	// Loop over rows
	var rowIndex = -1;
	for (var i=0; i<this.rows.length; i++) {
		if (! this.rows[i].enabled)
			continue;

		rowIndex ++;

		if (this.page && (rowIndex < this.page * (this.currentPage - 1)))
			continue;
		if (this.page && (rowIndex >= this.page * this.currentPage))
			continue;

		html += this.renderRow(this.rows[i]);
	}

	// Close TABLE tag
	html += '</table>';

	// If we need pagination on bottom, show it (in the wrapping table)
	if (htmlPage) {
		html += '</td></tr>';
		for (var i=0; i<this.pageControls.position.length; i++) {
			if (this.pageControls.position[i] == 'bottom')
				html += htmlPage;
		}
		html += '</table>';
	}

	// Render HTML
	if (this.div) {
		var element = document.getElementById(this.div);
		if (element)
			element.innerHTML = html;

		// Set listeners on the filter for the Enter key
		if (this.filter.visible) {
			for (var i=0; i < this.header.cells.length; i++) {
				if (this.header.cells[i].filter.enabled) {
					$('#FLTR' + this.header.cells[i].filter.id).off('keydown', 'input');
					$('#FLTR' + this.header.cells[i].filter.id).on('keydown', 'input', this.captureEnter);
				}
			}
		}

		// If exec params are set, execute them
		var exec = this.asArray(this.exec);
		for (var i=0; i<exec.length; i++) {
			if (typeof exec[i] == 'function')
				exec[i];
			else if (typeof exec[i] == 'string')
				eval(exec[i] + "()");
		}
	}

	// Call the post-rendering function
	if (this.callback)
		this.callback();

	return html;
};

/**
 * Render header + filter
 */
guidoTable.prototype.renderHeader = function () {
	this.logger.debug("Entering function renderHeader()...");
	if (! this.header.enabled)
		return '';

	var html = '<tr ' + this._renderCommon(this.header) + '>';

	// If filter is enabled, show icon in a first column
	if (this.filter.enabled)
		html += '<td>' + this.getFilterControl() + '</td>';

	for (var i=0; i < this.header.cells.length; i++) {
		// See if this column is enabled for rendering in the header
		if (this.header.cells[i].enabled)
			html += this.renderCell(this.header.cells[i], i, true);
	}

	html += '</tr>';

	// Render filter
	if (this.filter.enabled && this.filter.visible) {
		html += '<tr><td></td>';

		for (var i=0; i < this.header.cells.length; i++) {
			html += '<td>';

			if (this.header.cells[i].filter.enabled)
				html += '<form id=FLTR' + this.header.cells[i].filter.id + 
					' table_id=' + this.id + 
					'><input id=' + this.header.cells[i].filter.id +
					' type=text ' + 
					' value="' + this.header.cells[i].filter.value + '"' +
					this.cssHtml(this.asArray(this.filter.css)) + 
					'></form>';

			html += '</td>';
		}

		html += '</tr>';
	}

	return html;	
};


/**
 * Render row
 */
guidoTable.prototype.renderRow = function (row) {
	this.logger.debug("Entering function renderRow()...");
	if (! row.enabled)
		return '';

	if (this.rowIdx % 2 == 0)
		row.cssExtra = this.cssEven;
	else
		row.cssExtra = this.cssOdd;
	this.rowIdx ++;

	var html = '<tr ' + this._renderCommon(row) + '>';

	// If filter is enabled, insert empty column for the filter toggle (rendered in header row)
	if (this.filter.enabled)
		html += '<td></td>';

	for (var i=0; i<row.cells.length; i++) {
		// See if this column is enabled for rendering in the header
		if (this.header.cells[i].enabled)
			html += this.renderCell(row.cells[i], i, false);
	}

	html += '</tr>';

	// If there is a special htmlPost property, add it verbatim
	if (row.htmlPost)
		html += row.htmlPost;

	return html;	
};

/**
 * Render cell
 */
guidoTable.prototype.renderCell = function (cell, columnId, isHeader) {
	this.logger.debug("Entering function renderCell()...");

	var html = '<td ';

	html += this._renderCommon(cell);

	html += '>';

	if (cell.hasOwnProperty('content') && cell.content !== null) {
		// Check if we need to call a rendering function
		if (isHeader)
			html += cell.content;
		else {
			if (cell.hasOwnProperty('onRender'))
				html += cell.onRender(cell.content);
			else if (this.header.cells[columnId].hasOwnProperty('onRender'))
				html += this.header.cells[columnId].onRender(cell.content);
			else
				html += cell.content;
		}
	}

	// Header cells may be sortable
	// Sorting arrows: use ↑ and ↓ for directions, ⇧ and ⇩ for current sort
	if (cell.sort) {
		// ASC
		if ((this.sort == columnId) && (this.direction == 'asc'))
			html += '&nbsp;' + this.getSortControl(cell, 'sortedAsc');
		else 
			html += '&nbsp;<a href=# onClick="guidoTableSort(\'' + this.id + '\' , ' + columnId + ',\'asc\')">' + this.getSortControl(cell, 'sortAsc') + '</a>';

		// DESC
		if ((this.sort == columnId) && (this.direction == 'desc'))
			html += '&nbsp;' + this.getSortControl(cell, 'sortedDesc');
		else 
			html += '&nbsp;<a href=# onClick="guidoTableSort(\'' + this.id + '\' , ' + columnId + ',\'desc\')">' + this.getSortControl(cell, 'sortDesc') + '</a>';
	}

	html += '</td>';

	// If there is a special htmlPost property, add it verbatim
	if (cell.htmlPost)
		html += cell.htmlPost;

	return html;	
};


/**
 * Render common HTML attributes
 */
guidoTable.prototype._renderCommon = function (item) {
	this.logger.debug("Entering function _renderCommon()...");

	var html = ' ';

	// Attach ID
	html += 'id="' + item.id + '" ';

	// Attach CSS
	html += this.cssHtml(this.asArray(item.css, item.cssExtra));

	// Attach colspan/rowspan
	if (item.rowspan)
		html += ' rowspan=' + item.rowspan + ' ';

	if (item.colspan)
		html += ' colspan=' + item.colspan + ' ';

/*
	// Attach onClick (either as a string or inline function)
	if (field.onClick) {
		html += ' onClick="' + field.onChange;
		if (typeof field.onClick != 'function')
			html += '();';
		html += '" ';
	}
*/

	return html;
};


/**
 * Enable or disable a row
 */
guidoTable.prototype.setEnabled = function(id, enabled) {
	this.logger.debug("Entering function setEnabled()...");

	for (var i=0; i<this.rows.length; i++) {
		if (this.rows[i].id == id) {
			this.rows[i].enabled = enabled;

			// Re-render the form
			this.render();

			break;
		}
	}
};

/**
 * Add a row
 * Position can be 'first', 'last' or ID of the row to insert after
 */
guidoTable.prototype.addRow = function(row, position, render) {
	this.logger.debug("Entering function addRow()...");

	if (! position)
		position = 'last';

	// Row: create an ID if not supplied
	if (! row.hasOwnProperty('id'))
		row.id = 'tr' + this.uuid4();

	for (var i=0; i<row.cells.length; i++) {
		if (! row.cells[i].hasOwnProperty('id'))
			row.cells[i].id = 'td' + this.uuid4();
	}

	// Rows: Set default enabled
	if (! row.hasOwnProperty('enabled'))
		row.enabled = true;

	// Insert the row
	switch(position) {
		case 'first': 
			this.rows.splice(0, 0, row);
			break;

		case 'last':
			this.rows.push(row);
			break;

		default:
			for (var i=0; i<this.rows.length; i++) {
				if (this.rows[i].id == position) {
					this.rows.splice(i+1, 0, row);
					break;
				}
			}
	}

	if (render)
		this.render();
};

/**
 * Delete a row
 */
guidoTable.prototype.delRow = function(id, render) {
	this.logger.debug("Entering function delRow()...");

	if (! id)
		return;

	for (var i=0; i<this.rows.length; i++) {
		if (this.rows[i].id == id) {
			this.rows.splice(i+1, 1);
			break;
		}
	}

	if (render)
		this.render();
};

/**
 * Generate a random UUID-4
 */
guidoTable.prototype.uuid4 = function() {
	//var uuid4 = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
	var uuid4 = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(
		/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});

	return uuid4;
};

/**
 * Convert string to array with one element
 * Useful when one or more values are acceptable per property.
 */
guidoTable.prototype.asArray = function(data, data2) {
	var ret = [];

	if (data) {
		if (data.constructor == Array) {
			for (var i=0; i<data.length; i++)
				ret.push(data[i]);
		}
		else
			ret.push(data);
	}

	if (data2) {
		if (data2.constructor == Array) {
			for (var i=0; i<data2.length; i++)
				ret.push(data2[i]);
		}
		else
			ret.push(data2);
	}

	return ret;
};


/**
 * Compose CSS class list for HTML
 */
guidoTable.prototype.cssHtml = function(css) {
	if (!css)
		return '';

	var html = 'class="';

	for (var i=0; i<css.length; i++)
		html += css[i] + ' ';

	html += '" ';

	return html;
};


/**
 * Get HTML to render as sorting control
 */
guidoTable.prototype.getSortControl = function(cell, sortControlType) {
	// Get sort control
	var control = '';
		if (cell.sortControls && cell.sortControls[sortControlType])
		control = cell.sortControls[sortControlType];
	else if (this.sortControls && this.sortControls[sortControlType])
		control = this.sortControls[sortControlType];

	// Check HTML
	var re = /^\s*<.*$/;
	if (control && control.match(re))
		return control;

	// Get the symbol
	var symbol = '';
	switch(sortControlType) {
		case 'sortAsc':
			symbol = '↑';
			break;
		case 'sortDesc':
			symbol =  '↓';
			break;
		case 'sortedAsc':
			symbol =  '⇧';
			break;
		case 'sortedDesc':
			symbol =  '⇩';
			break;
	}

	if (control) {
		if (control == 'guido')
			return '<span style="font-family: Guido">' + symbol + '</span>';
		else
			return '<span style=' + control + '>' + symbol + '</span>';
	}
	else
		return symbol;
};


/**
 * Get HTML to render as pagination controls
 */
guidoTable.prototype.getPageControls = function() {
	this.logger.debug("Entering function getPageControls()...");

	if (! this.page)
		return null;

	var html = '';
	var htmlPage = '';

	// Calculate number of visible rows
	var rowCnt = 0;
	for (var i=0; i<this.rows.length; i++) {
		if (this.rows[i].enabled)
			rowCnt++;
	}

	// Calculate previous, next and last pages
	var pageP = this.currentPage - 1;
	var pageN = this.currentPage + 1;
	var pageL = parseInt(rowCnt / this.page, 10);
	if (rowCnt % this.page)
		pageL ++;
/*
	We show the following pages: first (F), previous (P), current (C), next (N), last (L) 
	Default form: F ... P C N ... L
	When the current is first: C N ... L
	When the current is second: F C N ... L
	When the current is third: F P C N ... L
	Similar exceptions when the current is third to last, second to last or last	
	When there are no pages between F and P, no ellipse is shown (same for N and L)
	All but C are links.
*/
	// Add F. If C==F, do not add link.
	if (this.currentPage > 1)
		htmlPage += '<a href=javascript:void(0) onClick="guidoTablePage(\'' + this.id + '\', ' + 1 + ')";>1</a> ';
	else
		htmlPage += '<b>1</b> ';

	// If C==2, add it
	if (this.currentPage == 2)
		htmlPage += '<b>2</b> ';

	// If C is at least 4, add ellipse
	if (this.currentPage > 3)
		htmlPage += '... ';

	// If C==3, add P and C
	if (this.currentPage >= 3) {
		htmlPage += '<a href=javascript:void(0) onClick="guidoTablePage(\'' + this.id + '\', ' + pageP + ')";>' + pageP + '</a> ';
		htmlPage += '<b>' + this.currentPage + '</b> ';
	}

	// If C<(L-1), show N page
	if (this.currentPage < (pageL - 1))
		htmlPage += '<a href=javascript:void(0) onClick="guidoTablePage(\'' + this.id + '\', ' + pageN + ')";>' + pageN + '</a> ';

	// If C<(L-2), show ellipse
	if (this.currentPage < (pageL - 2))
		htmlPage += '... ';

	// Show L
	if (this.currentPage != pageL)
		htmlPage += '<a href=javascript:void(0) onClick="guidoTablePage(\'' + this.id + '\', ' + pageL + ')";>' + pageL + '</a> ';

	// Assenble a table row with controls on left, right or both
	html += '<tr><td align=left ';
	html += this.cssHtml(this.asArray(this.pageControls.css));
	html += '>';
	for (var i=0; i<this.pageControls.align.length; i++) {
		if (this.pageControls.align[i] == 'left')
			html += htmlPage;
	}
	html += '</td><td align=right ';
	html += this.cssHtml(this.asArray(this.pageControls.css));
	html += '>';
	for (var i=0; i<this.pageControls.align.length; i++) {
		if (this.pageControls.align[i] == 'right')
			html += htmlPage;
	}
	html += '</td></tr>';

	return html;
};

/**
 * Get HTML to render as filter control
 */
guidoTable.prototype.getFilterControl = function() {
	if (! this.filter.enabled)
		return '';

	var html = '';
	if (this.filter.visible)
		html = '<a href=javascript:void(0) onClick="guidoTableFilter(\'' + this.id + '\', false)";>⊝</a>';
	else
		html = '<a href=javascript:void(0) onClick="guidoTableFilter(\'' + this.id + '\', true)";>⊕</a>';

	return html;
};


/**
 * Show filter
 */
guidoTable.prototype.filterShow = function() {
	this.logger.debug("Entering function filterShow()...");

	// Set filter row to visible
	this.filter.visible = true;

	// Re-render the form
	this.render();
};

/**
 * Run filter
 * TODO: At some point we may want a separate property for filter enable/disable in rows
 */
guidoTable.prototype.filterRun = function() {
	this.logger.debug("Entering function filterRun()...");

	// Read filter
	for (var i=0; i<this.header.cells.length; i++) {
		if (this.header.cells[i].filter.enabled)
			this.header.cells[i].filter.value = document.getElementById(this.header.cells[i].filter.id).value;
		else
			this.header.cells[i].filter.value = false;
	}

	// Apply saved filter
	for (var i=0; i < this.rows.length; i++) {
		this.rows[i].enabled = true;
		for(j=0; j < this.header.cells.length; j++) {
			if (! this.header.cells[j].filter.value)
				continue;

			if (this.rows[i].cells[j].content.toLowerCase().indexOf(this.header.cells[j].filter.value.toLowerCase()) < 0) {
				this.rows[i].enabled = false;
				break;
			}	
		}
	}

	// Re-render the form
	this.render();
};

/**
 * Disable filter
 */
guidoTable.prototype.filterHide = function() {
	this.logger.debug("Entering function filterHide()...");

	// Loop over all rows and enable all rows
	for (var i=0; i < this.rows.length; i++)
		this.rows[i].enabled = true;

	// Removed saved filters
	for (var i=0; i < this.header.cells.length; i++) {
		if (this.header.cells[i].filter.enabled)
			this.header.cells[i].filter.value = '';
	}

	// Hide the filter
	this.filter.visible = false;

	// Re-render the form
	this.render();
};

/**
 * Capture Enter key for filter
 */

guidoTable.prototype.captureEnter = function(event) {
	if (event.which != 13)
		return;

	event.preventDefault();

	var tableId = $(event.target.form).attr('table_id');
	appRun.tables[tableId].filterRun();
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = guidoTable;

