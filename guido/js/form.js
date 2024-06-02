/**
 * Constructor
 *
 * @param params object Object to costruct the form from.
 * @param callback function Function to call after the validation; params (error, result) where result is the form data, ready to be submitted.
 */
var guidoForm = function(params, callback) {
	// Form name & ID
	this.id = params.id || 'F' + this.uuid4();	// Make sure we always start with a letter!
	this.name = params.name || this.id;
	guidoRun.forms[this.id] = this;

	// Check if DATALIST is supported
	this.datalistSupported = ('options' in document.createElement('datalist')) ? true : false;

	// Store the callback
	this.callback = callback;

	// Form fields object
	this.fields = params.fields || {};

	// Form CSS
	this.css = params.css || null;

	// Exec function(s)
	this.exec = params.exec || null;

	this.logger = new guidoLogger({app_name: 'Forms'});
	if (params.logger && params.logger.log_level)
		this.logger.log_level = params.logger.log_level;
	else if (appRun && appRun.logger && appRun.logger.log_level)
		this.logger.log_level = appRun.logger.log_level;

	// Set default enabled
	var fields = Object.keys(this.fields);
	for (var i=0; i < fields.length; i++) {
		this.fields[fields[i]].filtered = false;
		if (! this.fields[fields[i]].hasOwnProperty('enabled'))
			this.fields[fields[i]].enabled = true;
	}

	// Create an ID if not supplied (also for multiField)
	for (var i=0; i < fields.length; i++) {
		if (! this.fields[fields[i]].hasOwnProperty('id'))
			this.fields[fields[i]].id = 'g' + this.uuid4();;
		if (! this.fields[fields[i]].hasOwnProperty('attributes'))
			this.fields[fields[i]].attributes = {};
		if (! this.fields[fields[i]].attributes.hasOwnProperty('id'))
			this.fields[fields[i]].attributes.id = 'f' + this.uuid4();
		if (this.fields[fields[i]].multiField)
			this.fields[fields[i]].multiField.id = 'mf' + this.uuid4();
	}

	// If rendering a form with multiple values per INPUT, convert them to multifield
	// For this, remove the array and produce a multiField
	for (var i=0; i < fields.length; i++) {
		if ((this.fields[fields[i]].type == 'INPUT') || (this.fields[fields[i]].type == 'CHECKBOX')) {
			// If field.extra.text is array (usually for text inputs)
			if (this.fields[fields[i]].extra && this.fields[fields[i]].extra.text && this.fields[fields[i]].extra.text.sort) {
				var tmpText = [];
				guidoCopyArray(this.fields[fields[i]].extra.text, tmpText);

				this.fields[fields[i]].extra.text = tmpText[0];

				if (! this.fields[fields[i]].multiField)
					this.fields[fields[i]].multiField = {};

				for (var j=1; j < tmpText.length; j++)
					this.multiFieldAdd(this.fields[fields[i]].attributes.id, {text: tmpText[j]});
			}

			// If field.extra.multifield is an array (usually for checkboxes)
			if (this.fields[fields[i]].extra && this.fields[fields[i]].extra.multifield && this.fields[fields[i]].extra.multifield.sort) {
				var tmpMF = [];
				guidoCopyArray(this.fields[fields[i]].extra.multifield, tmpMF);

				//this.fields[fields[i]].extra.multifield = tmpMF[0];

				if (! this.fields[fields[i]].multiField)
					this.fields[fields[i]].multiField = {};

				//for (var j=1; j < tmpMF.length; j++)
				for (var j=0; j < tmpMF.length; j++)
					this.multiFieldAdd(this.fields[fields[i]].attributes.id, tmpMF[j]);

				delete this.fields[fields[i]];
			}
		}
	}

	// Form validator
	this.validator = params.validator || {};
	if (! this.validator.hasOwnProperty('enabled'))
		this.validator.enabled = true;

	// Register the form
	if (! appRun.forms)
		appRun.forms = {};
	appRun.forms[this.id] = this;

	// Render the form
	if (params.div) {
		this.div = params.div;
		this.render(this.div);
	}
};

/**
 * Run validators
 */
guidoForm.prototype.validate = function () {
	this.logger.debug("Entering function validate()...");

	var check = true;
	var error = false;

	// Populate the fields in the object with their values form the form and fetch them here
	this.readValues();

	// Run field validation loop
	var fields = Object.keys(this.fields);
	for (i=0; i<fields.length; i++) {
		var field = this.fields[fields[i]];
		if (field.enabled && field.validator && field.validator.enabled) {
			// If external validator for this field was provided, call it
			// NB! The external validator for a field must return TRUE if everything passed! Every FALSE value will be considered failure and callback will be invoked with the field as error!
			if (typeof field.validator.validate == 'function') {
				check = field.validator.validate(field.value);
				if (! check)
					return this.callback(field, null);
			}
			// Else run internal validation
			else {
				check = this._validate(field);
				if (! check)
					return this.callback(field, null);
			}

		}
	}

	// Check if external validator was supplied and call it
	// NB! The external validator for the full form must return FALSE if everything passed! Every TRUE value will be considered failure and will be passed back to the callback as error!
	if (typeof this.validator.validate == 'function') {
		error = this.validator.validate(this);
		if (error)
			return this.callback(error, null);
		else
			return this.callback(null, this.getFormData());
	}

	// NB! Re-read the form data values since the validator may have converted them (int to string, for esample)
	return this.callback(null, this.getFormData());
};


/**
 * Internal validator
 */
guidoForm.prototype._validate = function (field) {
	this.logger.debug("Entering function _validate()...");

	// For strings, we need to trim first
	if (field.value.trim)
		field.value = field.value.trim();

	// In order to valudate, we need a value - but we must allow arithmetic 0
	if (! field.value && (field.value !== 0))
		return false;

	// Validator can be a string (name) or array of strings (names)
	var validators = this.asArray(field.validator.validate);
	for (var i=0; i<validators.length; i++) {
		switch(validators[i]) {
			case 'notempty':
				// NOOP as this is already covered by the check for field.value above
				break;
			case 'integer':
				if (field.value !== parseInt(field.value, 10))
					return false;
				break;
			case 'float':
				if (field.value !== parseFloat(field.value, 10))
					return false;
				break;
			case 'positive':
				if (field.value <= 0)
					return false;
				break;
			case 'non-negative':
				if (field.value < 0)
					return false;
				break;
			case 'negative':
				if (field.value >= 0)
					return false;
				break;
			case 'alphanumeric':
				var str = field.value;
				if (typeof field.value == 'number')
					str += '';
				if (! str.match)
					return false;
				var re = /^[a-zA-Z0-9]*$/;
				if (! str.match(re))
					return false;
				break;
			case 'ipv4':
				if (! guidoMatchIpv4(field.value))
					return false;
				break;
			case 'cidr':
				if (! guidoMatchCidr(field.value))
					return false;
				break;
			case 'url':
				if (! guidoMatchUrl(field.value))
					return false;
				break;
		}
	}

	return true;
};


/**
 * Read all form values into the object
 */
guidoForm.prototype.readValues = function (rerender) {
	this.logger.debug("Entering function readValues()...");

	// If the form is just being created, it is not yet attached; return if so
	if (! document.getElementById(this.id))
		return;

	var fields = Object.keys(this.fields);
	var elements = document.getElementById(this.id).elements;

	if (! elements)
		return;

	for(var i=0; i < elements.length; i++) {
		for (var j=0; j < fields.length; j++) {
			var field = this.fields[fields[j]];
			if (field.enabled && (field.attributes.id == elements[i].id)) {
				var value = null;
				switch(field.type) {
					case 'INPUT':
						value = elements[i].value;
						break;
					case 'TEXTAREA':
						value = elements[i].value;
						break;
					case 'SELECT':
						// Get real value if INPUT was made from a SELECT -> DATALIST 
						if (field.extra && field.extra.datalist && this.datalistSupported) {
							value = elements[i].value;
							if (! rerender) {
								for (var k=0; k < field.extra.options.length; k++) {
									if (value == field.extra.options[k].text) {
										value = field.extra.options[k].value;
										break;
									}
								}
							}
						}
						else {
							if (field.attributes.multiple) {
								// Retrieve multiple selections
								value = [];
								for (var k=0, kLen=elements[i].options.length; k<kLen; k++) {
									if (elements[i].options[k].selected)
										value.push(elements[i].options[k].value);
								}
							}
							else {
								// Single-choice select
								var index = elements[i].selectedIndex;
								// Drop-down may be empty (-1 returned as index in this case)
								if (index > -1)
									value = elements[i].options[index].value;
							}
						}
						break;
					case 'CHECKBOX':
						value = elements[i].checked;

						// Multifield checkboxes that are selected need the value set to the ID of the checkbox
						if (value && field.multiField && field.extra && field.extra.id)
							value = field.extra.id;
						break;
					case 'RADIO':
						value = (elements[i].checked) ? elements[i].value : field.value;
						break;
					case 'FILE':
						value = (field.eventChangeFile) ? field.eventChangeFile : null;
						break;
				}

				// The borwser always return the value as string. 
				// Check if it is an integer and convert it so (unless we explictily want a string for this field)
				// Exception: FILE
				if ((value !== null) && (field.type != 'FILE')) {
					if (parseFloat(value) == value) {
						if (! field.getAsString)
							value = parseFloat(value);
					}
				}

				field.value = value;
			}
		}
	}
};


/**
 * Render form
 */
guidoForm.prototype.render = function (div, rerender) {
	this.logger.debug("Entering function render()...");

	if (div)
		this.div = div;

	// Order fields by fields.order, ASC
	var tmp;
	var fields = Object.keys(this.fields);
	for (var i=0; i<fields.length-1; i++) {
		for (var j=0; j<fields.length-1; j++) {
			if (this.fields[fields[j]].order > this.fields[fields[j+1]].order) {
				tmp = fields[j];
				fields[j] = fields[j+1];
				fields[j+1] = tmp;
			}
		}
	}

	// Add the 'value' property to each field with a NULL value
	for (var i=0; i<fields.length-1; i++) {
		if (! this.fields[fields[i]].hasOwnProperty('value'))
			this.fields[fields[i]].value = null;
	}

	// Read values in case we need to re-render
	this.readValues(rerender);

	// Compose HTML
	// We do not set METHOD and ACTION attributes here, because we don't want the browser to submit the form!
	var html = '<form name="' + this.name + '" id="' + this.id + '" ';

	html += this.cssHtml(this.asArray(this.css));

	html += '>';

	for (var i=0; i<fields.length; i++) {
		var field = this.fields[fields[i]];

		// Skip field if field is disabled
		if (! field.enabled)
			continue;

		var uuid4 = field.divId = this.uuid4();
		html += '<div id=' + uuid4 + ' name=' + uuid4 + ' ';

		// Render the CSS of the DIV if such is present and:
		// - if the field is enabled
		// - if the field is disabled, but the stripCssField is not set
//		if (field.cssField && (field.enabled || (!field.enabled && !field.stripCssField)))
			html += this.cssHtml(this.asArray(field.cssField));

		html += '>';

		// Only display the field inside the DIV if it is enabled.
		if (field.enabled)
			html += this.renderField(field);

		html += '</div>';
	}
	html += '</form>';

	// Render HTML
	if (this.div) {
		var element = document.getElementById(this.div);
		if (element)
			element.innerHTML = html;

		// If this field should submit on Enter key, set up a listener
		var self = this;

		// Set a global listener on this form for the Enter key
		$('#' + this.id).off('keydown', 'input');
		$('#' + this.id).on('keydown', 'input', this.captureEnter);

		// If exec params are set, execute them
		var exec = this.asArray(this.exec);
		for (var i=0; i<exec.length; i++) {
			if (typeof exec[i] == 'function')
				exec[i];
			else if (typeof exec[i] == 'string')
				eval(exec[i] + "()");
		}
	}

	return html;
};


/**
 * Render field
 */
guidoForm.prototype.renderField = function (field) {
	this.logger.debug("Entering function renderField()...");

	var html = '';

	// Set label if defined
	if (field.label) {
		html += '<span ';
		html += (field.cssLabel) ? this.cssHtml(this.asArray(field.cssLabel)) : '';
		html += '>' + field.label;
	}
	if (field.extra && field.extra.label)
		html += ' ' + field.extra.label;
	html += '</span>';

	// NB: We wrap the <input> in a span to allow positioning via CSS
	html += '<span ';
	html += (field.cssInput) ? this.cssHtml(this.asArray(field.cssInput)) : '';
	html += '>';

	// Process field based on its type
	switch(field.type) {
		case 'INPUT':
			html += this.renderInput(field);
			break;
		case 'TEXTAREA':
			html += this.renderTextarea(field);
			break;
		case 'SELECT':
			html += this.renderSelect(field);
			break;
		case 'CHECKBOX':
			html += this.renderCheckbox(field);
			break;
		case 'RADIO':
			html += this.renderRadio(field);
			break;
		case 'BUTTON':
			html += this.renderButton(field);
			break;
		case 'TEXT':
			html += this.renderText(field);
			break;
		case 'FILE':
			html += this.renderFile(field);
			break;
	}

	html += '</span>';

	return html;
};


/**
 * Render common HTML attributes
 */
guidoForm.prototype._renderCommon = function (field) {
	this.logger.debug("Entering function _renderCommon()...");

	var html = ' ';

	var keys = Object.keys(field.attributes);
	for(var i=0; i<keys.length; i++) {
		// Handle attributes that have no value - we set them the value "GUIDO_TRUE" in GUIdo
		if (field.attributes[keys[i]] == 'GUIDO_TRUE')
			html += keys[i] + ' ';
		else
			html += keys[i] + '="' + field.attributes[keys[i]] + '" ';
	}

	// Attach CSS
	/*
	Disabled as we now attach the CSS to the <span> which wraps the <input>
	To make the form element inherit properties, set them explicitly like this:
	 	input, select, textarea, checkbox, button {
			font-family: inherit;
			font-size: inherit;
			...
		}
	*/
	//html += this.cssHtml(this.asArray(field.cssInput));

	// Attach onChange (either as a string or inline function)
	if (field.onChange) {
		html += ' onChange="' + field.onChange;
		if (typeof field.onChange != 'function')
			html += '();';
		html += '" ';
	}

	return html;
};


/**
 * Render INPUT
 */
guidoForm.prototype.renderInput = function (field) {
	this.logger.debug("Entering function renderInput()...");

	// Copy the value as attribute if it had been read (e.g., when re-rendering) - or use a default if specified
	if (field.value)
		field.attributes.value = field.value;
	else if (field.extra && (field.extra.text != undefined) && (field.extra.text != null))
		field.attributes.value = field.extra.text;

	var html = '<input ';

	html += this._renderCommon(field);

	// Attach extra
	if (field.extra && field.extra.submitOnEnter)
		html += ' guidoSubmit=submitOnEnter';

	if (field.attributes.type && (field.attributes.type == 'submit')) {
		html += ' onClick="appRun.forms.' + this.id + '.validator()"';
		this.logger.warning("You should not use INPUT elements with TYPE=SUBMIT; use BUTTON instead.");
	}

	html += '>';

	var cssInput = this.cssHtml(this.asArray(field.cssInput));

	// Specials for password fields
	if (field.attributes.type == 'password') {
		// Attach "show password" button
		if (field.extra && field.extra.toggle && field.extra.toggle.enabled) {
			var cssEye = this.cssHtml(this.asArray(field.extra.toggle.cssInput));
			html += '<span ' + cssEye  + '>';
			html += ' <a href=javascript:void(0) style="text-decoration:none;" onClick="appRun.forms.' + this.id + '.togglePassword(\'' + field.attributes.id + '\')">👁</a> ';
			html += '</span>';
		}

		// Attach "generate password" button
		if (field.generator && field.generator.enabled) {
			var cssButton = this.cssHtml(this.asArray(field.generator.cssInput));
			html += ' <span ' + cssButton + '> <button type=button onClick="appRun.forms.' + this.id + '.generatePassword(\'' + field.attributes.id + '\', \'' + field.id + '\')">' + _("Generate") + '</button></span>';
		}
	}

	// Multi-field INPUTs
	if (field.multiField) {
		// Check how many rows of this type we have (the last row should not have the removal button [-])
		var counter = 0;
		var fields = Object.keys(this.fields);
		for (var i=0; i<fields.length; i++) {
			if ((this.fields[fields[i]].multiField) && (this.fields[fields[i]].multiField.id == field.multiField.id))
				counter++;
		}

		cssMF = this.cssHtml(this.asArray(field.multiField.cssInput));
		cssSpacer = this.cssHtml(this.asArray(field.multiField.cssSpacer));

		html += '<span ' + cssSpacer  + '>&nbsp;</span>';
		html += '<button type=button ' + cssMF + ' onClick="appRun.forms.' + this.id + '.multiFieldAdd(\'' + field.attributes.id + '\', 0, 1)">+</button>';
		if (counter > 1) {
			html += '<span ' + cssSpacer  + '>&nbsp;</span>';
			html += '<button type=button ' + cssMF + ' onClick="appRun.forms.' + this.id + '.multiFieldDel(\'' + field.attributes.id + '\')">-</button>';
		}
	}

	return html;
};

/**
 * Render FILE
 */
guidoForm.prototype.renderFile = function (field) {
	this.logger.debug("Entering function renderFile()...");

	// Copy the file name if it had been set (e.g., when re-rendering)
	//FIXME: We need the File object here
/*
	if (field.eventChangeFile) {
		field.attributes.value = field.value;
	}
*/

	var html = '<input type=file onChange=guidoFormGetFile(event) ';

	html += this._renderCommon(field);

	html += '>';

	return html;
};

/**
 * Render TEXTAREA
 */
guidoForm.prototype.renderTextarea = function (field) {
	this.logger.debug("Entering function renderTextarea()...");

	var html = '<textarea ';

	html += this._renderCommon(field);

	html += '>';

	if (field.value)
		html += field.value;
	else if (field.extra && field.extra.text)
		html += field.extra.text;

	html += '</textarea>';

	return html;
};


/**
 * Render SELECT
 */
guidoForm.prototype.renderSelect = function (field) {
	this.logger.debug("Entering function renderSelect()...");
	var html = '';

	// Render as INPUT + DATALIST or regular SELECT (with optional multiple selection)
	if (field.extra && field.extra.hasOwnProperty('datalist') && this.datalistSupported) {
		// Assign a datalist name if not given
		if (! field.extra.datalist)
			field.extra.datalist = this.uuid4();

		if (field.extra.options) {
			html += '<datalist id=' + field.extra.datalist + '>';
			for (var i=0; i<field.extra.options.length; i++)
				html += '<option value="' + field.extra.options[i].text + '">';
			html += '</datalist>';
		}

		// Copy the value as attribute if it had been read (e.g., when re-rendering) - or use a default if specified
		if (field.value) {
			// NB: field.value contains the "value" from the field.extra.options array element, and we want the "text" here
			for (var i=0; i<field.extra.options.length; i++) {
				if (field.value == field.extra.options[i].value) {
					field.attributes.value = field.extra.options[i].text;
					break;
				}
			}
		}
		else if (field.extra && (field.extra.text != undefined) && (field.extra.text != null))
			field.attributes.value = field.extra.text;

		html += '<input list=' + field.extra.datalist + ' ';
		html += this._renderCommon(field);
		if (field.extra.submitOnEnter)
			html += ' guidoSubmit=submitOnEnter';
		html += '>';
	}
	else {
		html += '<select ';
		html += this._renderCommon(field);
		html += '>';

		// Sort the options if asked to
		if (field.extra && field.extra.sort)
			guidoSortObjects(field.extra.options, 'text', field.extra.sort, field.extra.comparator);

		// See which should be selected
		var selected = [];
		if (field.value)
			selected = this.asArray(field.value);
		else if (field.extra && field.extra.selected != null)
			selected = this.asArray(field.extra.selected);

		if (field.extra && field.extra.options) {
			for (var i=0; i<field.extra.options.length; i++) {
				html += '<option value="' + field.extra.options[i].value + '" ';

				for (var j=0; j < selected.length; j++) {
					if (field.extra.options[i].value == selected[j]) {
						html += 'selected ';
						break;
					}
				}

				html += '>' + field.extra.options[i].text + '</option>';
			}
		}
		html += '</select>';
	}

	return html;
};


/**
 * Render CHECKBOX
 */
guidoForm.prototype.renderCheckbox = function (field) {
	this.logger.debug("Entering function renderCheckbox()...");

	var html = '<input type=checkbox ';

	if (field.extra && field.extra.id)
		html += ' extraId=' + field.extra.id + ' ';

	html += this._renderCommon(field);

	// See which should be selected
	var selected;
	if (field.value !== null)
		selected = field.value;
	else if (field.extra && (field.extra.selected !== null))
		selected = field.extra.selected;
	html += (selected) ? ' checked ' : '';

	html += '>';

	return html;
};


/**
 * Render RADIO
 */
guidoForm.prototype.renderRadio = function (field) {
	this.logger.debug("Entering function renderRadio()...");

	var html = '';
	if (field.extra && field.extra.options) {
		for (var i=0; i<field.extra.options.length; i++) {
			html += '<input type=radio ';

			html += this._renderCommon(field);

			// See which should be selected
			var selected;
			if (field.value)
				selected = field.value;
			else if (field.extra.selected)
				selected = field.extra.selected;
			html += (selected == field.extra.options[i].value) ? ' checked ' : '';

			html += 'value=' + field.extra.options[i].value + ' ';

			html += '>';

			html += field.extra.options[i].text;
		}
	}

	return html;
};


/**
 * Render BUTTON
 */
guidoForm.prototype.renderButton = function (field) {
	this.logger.debug("Entering function renderInput()...");

	var html = '<button type=button ';

	html += this._renderCommon(field);

	// Set action
	if (field.extra && field.extra.hasOwnProperty('action')) {
		if (field.extra.action == 'submit')
			html += ' onClick="appRun.forms.' + this.id + '.validate()" ';
		else {
			if (typeof field.extra.action == 'function')
				html += ' onClick="' + field.extra.action + '" ';
			else
				html += ' onClick="\'' + field.extra.action + '()\'" ';
		}
	}

	html += '>';

	html += (field.extra && field.extra.text) ? field.extra.text : '';

	html += '</button>';

	return html;
};


/**
 * Render TEXT
 */
guidoForm.prototype.renderText = function (field) {
	this.logger.debug("Entering function renderText()...");

	var html = '<span ';

	html += this._renderCommon(field);

	html += 'span>';

	if (field.extra && field.extra.text)
		html += field.extra.text;

	html += '</span>';

	return html;
};


/**
 * Get the form data and return it in jQuery-ready object ({key:value,})
 * If multiple inputs have the same ID (multi-field), values will be returned as array
 */
guidoForm.prototype.getFormData = function() {
	this.logger.debug("Entering function getFormData()...");

	var data = {};

	var fields = Object.keys(this.fields);
	for (var i=0; i < fields.length; i++) {
		var field = this.fields[fields[i]];

		if (! field.enabled)
			continue;

		// Multifield checkbox must return array, even if empty (i.e. no checkbox was selected)
		if ((field.type == 'CHECKBOX') && field.multiField && !data.hasOwnProperty(field.attributes.name))
			data[field.attributes.name] = [];

		if (field.value !== null) {
			if (data.hasOwnProperty(field.attributes.name)) {
				// For multifield checkboxes, exclude FALSE values as these were not selected
				if ((field.type == 'CHECKBOX') && field.multiField && ! field.value)
					continue;

				if (data[field.attributes.name].constructor == Array)
					data[field.attributes.name].push(field.value);
				else
					data[field.attributes.name] = [data[field.attributes.name], field.value];
			}
			else
				data[field.attributes.name] = field.value;
		}
	}

	return data;
};

/**
 * Generate a random UUID-4
 */
guidoForm.prototype.uuid4 = function() {
	//var uuid4 = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
	var uuid4 = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(
		/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});

	return uuid4;
};

/**
 * Enable or disable a field
 */
guidoForm.prototype.setEnabled = function(id, enabled) {
	this.logger.debug("Entering function setEnabled()...");

	var fields = Object.keys(this.fields);
	for (var i=0; i < fields.length; i++) {
		var field = this.fields[fields[i]];

		// Check on ID from attributes (unique per every field)
		if (field.attributes.id == id)
			field.enabled = enabled;

		// Check on ID of the field (will be the same on multifields)
		if (field.id == id)
			field.enabled = enabled;
	}

	// Re-render the form
	this.render(null, true);
};

/**
 * Add multi-form input
 */
guidoForm.prototype.multiFieldAdd = function(id, value, render) {
	var fields = Object.keys(this.fields);

	for (var i=0; i < fields.length; i++) {
		var field = this.fields[fields[i]];
		if (field.attributes.id == id) {
			// Deep copy into new field
			var newField = {};
			guidoDeepCopyObject(field, newField);

			// Increment order, generate new ID
			newField.order ++;
			var newId = 'f' + this.uuid4();

			if (newField.attributes)
				newField.attributes.id = newId;

			// Set values if given (normally: text, label and id)
			if (value) {
				var keys = Object.keys(value);
				for (var j=0; j < keys.length; j++)
					newField.extra[keys[j]] = value[keys[j]];
			}

			// Attach to the form
			this.fields[newId] = newField;

			// Re-render the form if asked
			if (render)
				this.render(null, true);

			break;
		}
	}
};


/**
 * Delete multi-form input
 */
guidoForm.prototype.multiFieldDel = function(id) {
	var fields = Object.keys(this.fields);

	for (var i=0; i<fields.length; i++) {
		var field = this.fields[fields[i]];
		if (field.attributes.id == id) {
/*
			var element = document.getElementById(field.divId);
			element.parentNode.removeChild(element);
*/
			delete this.fields[fields[i]];
			this.render(null, true);
		}
	}
};


/**
 * Convert string to array with one element
 * Useful when one or more values are acceptable per property.
 */
guidoForm.prototype.asArray = function(data) {
	var ret = [];

	if (data) {
		if (Array.isArray(data)) {
			for (var i=0; i<data.length; i++)
				ret.push(data[i]);
		}
		else
			ret.push(data);
	}

	return ret;
};


/**
 * Compose CSS class list for HTML
 */
guidoForm.prototype.cssHtml = function(css) {
	if (!css)
		return '';

	var html = 'class="';

	for (var i=0; i<css.length; i++)
		html += css[i] + ' ';

	html += '" ';

	return html;
};

/**
 * Form listener to capture Enter key and act upon it
 */
guidoForm.prototype.captureEnter = function(event) {
	if (event.which != 13)
		return;

	event.preventDefault();

	// Get the form ID so that we may reach it
	var formId = $(event.target.form).attr('id');

	// Check if we have "guidoSubmit" in this field
	var guidoSubmit = $(event.target).attr("guidoSubmit");
	if (guidoSubmit)
		// Submit form
		guidoRun.forms[formId].validate();
	else {
		// Move focus to next input ID
		// Get current input ID
		var inputId = $(event.target).attr('id');

		// Get its order No from the form
		var inputOrder = -1;
		var fields = Object.keys(guidoRun.forms[formId].fields);
		for (var i=0; i<fields.length; i++) {
			if (inputId == guidoRun.forms[formId].fields[fields[i]].attributes.id) {
				inputOrder = guidoRun.forms[formId].fields[fields[i]].order;
			}
		}

		// Get the ID of the next element in the form
		var nextOrder = inputOrder;
		var nextId = null;
		for (var i=0; i<fields.length; i++) {
			var order = guidoRun.forms[formId].fields[fields[i]].order;
			if (order > inputOrder) {
				if (nextOrder == inputOrder) {
					nextOrder = order;
					nextId = guidoRun.forms[formId].fields[fields[i]].attributes.id;
				}
				else if (order < nextOrder) {
					nextOrder = order;
					nextId = guidoRun.forms[formId].fields[fields[i]].attributes.id;
				}
			}
		}

		// Move focus to next input field
		$('#' + nextId).focus();
    }
};

/**
 * Toggle password visibility for INPUT fieds
 */
guidoForm.prototype.togglePassword = function(elPasswordId) {
	var elPassword = document.getElementById(elPasswordId);

	if (elPassword.type == 'password')
		elPassword.type = 'text';
	else
		elPassword.type = 'password';
};

/**
 * Generate password for INPUT fieds and set field to plain text
 */
guidoForm.prototype.generatePassword = function(elPasswordId, fieldId) {
	var elPassword = document.getElementById(elPasswordId);

	// Field field by the provided passwordId
	var field = null;
	var fields = Object.keys(this.fields);
	for (var i=0; i < fields.length; i++) {
		if (this.fields[fields[i]].id == fieldId) {
			field = this.fields[fields[i]];
			break;
		}
	}

	// Show the text in the password field (if not visible already)
	if (elPassword.type == 'password')
		elPassword.type = 'text';

	// Select character set for password mode
	var mode = (field.generator.mode) ? field.generator.mode : 'alphanumeric';
	var characters;
	switch (mode) {
		case 'alphanumeric':
			characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			break;
		default:
			characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	}

	// Generate and set password
	var password = '';
	var size = (field.generator.size) || 16;
	for (var i=0; i < size; i++) 
		password += characters.charAt(Math.random() * characters.length | 0);

	elPassword.value = password;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = guidoForm;

