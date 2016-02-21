/**
 * Per-template loading method. 
 * Will be called whenever the template named 'main1' is attached to a parent. 
 */
function appLoadTemplate_main1() {
	appRun.logger.debug('Entering function appLoadTemplate_main1()...');

	// Example form and helper methods

	// If you need to reference fields later, then create their IDs manually and save them.
	// (Guido will automatically create IDs where they are not given)
	appRun.main1 = {};
	appRun.main1.formId = 'F' + appUtilRandomUuid();
	appRun.main1.fieldSelect1 = 'f' + appUtilRandomUuid();
	appRun.main1.fieldSelect2 = 'f' + appUtilRandomUuid();
	appRun.main1.fieldCheckbox2 = 'f' + appUtilRandomUuid();
	appRun.main1.fieldConditional = 'f' + appUtilRandomUuid();

	var params = {
		id: appRun.main1.formId,
		div: 'main1_form',
		css: 'form',
		fields: {
			input: {
				type: 'INPUT',
				order: 10,
				cssField: 'form_div',
				cssInput: 'form_input',
				attributes: {type:'text', placeholder: _('Input text'), name:'name', size:10, length:10, maxlength: 10},
				validator: {
					enabled: true,
					validate: 'notempty',
					error: _('Name cannot be empty.')
				}
			},
			password: {
				type: 'INPUT',
				order: 20,
				cssField: 'form_div',
				cssInput: 'form_input',
				attributes: {type:'password', placeholder: _('Input password'), name:'password'},
				validator: {
					enabled: true,
					validate: 'alphanumeric',
					error: _('Password must be alphanumeric.')
				}
			},
			select1: {
				type: 'SELECT',
				order: 30,
				label: _('Select 1: '),
				cssField: 'form_div',
				cssInput: 'form_select',
				attributes: {name:'select1', id: appRun.main1.fieldSelect1},
				extra: {
					options: [
						{value:'1', text: _('Choice A')},
						{value:'2', text: _('Choice B')},
						{value:'3', text: _('Choice C')},
					],
					sort: 'asc',
				},
				onChange: 'appOnChangeSelect1',
			},
			select2: {
				type: 'SELECT',
				order: 30,
				label: _('Select 2: '),
				cssField: 'form_div',
				cssInput: 'form_select',
				attributes: {name:'select2', id: appRun.main1.fieldSelect2},
				extra: {
					options: [
						{value:'1', text: _('Choice D')},
						{value:'2', text: _('Choice E')},
					],
					sort: 'asc',
				},
				onChange: 'appOnChangeSelect',
			},
			textarea: {
				type: 'TEXTAREA',
				order: 40,
				cssField: 'form_div',
				cssInput: 'form_input',
				attributes: {name:'textarea', rows:4, cols:40},
				extra: {
					text: _('A text area.'),
				}
			},
			radio: {
				type: 'RADIO',
				order: 40,
				label: _('Radio: '),
				cssField: 'form_div',
				cssInput: 'form_radio',
				attributes: {name:'radio'},
				extra: {
					options: [
						{value:'1', text: _('Station A')},
						{value:'2', text: _('Station B')},
						{value:'3', text: _('Station C')},
					],
					selected: '2',
				},
			},
			checkbox1: {
				type: 'CHECKBOX',
				order: 50,
				label: _('Checkbox 1: '),
				cssField: 'form_div',
				cssInput: 'form_chechbox',
				attributes: {name:'checkbox1'},
				extra: {
					selected: true,
				} 
			},
			checkbox2: {
				type: 'CHECKBOX',
				order: 60,
				label: _('Checkbox 2: '),
				cssField: 'form_div',
				cssInput: 'form_chechbox',
				attributes: {name:'checkbox2', id: appRun.main1.fieldCheckbox2},
				onChange: 'appOnChangeCheckbox2',
			},
			conditional: {
				type: 'INPUT',
				order: 70,
				enabled: false,
				cssField: 'form_div',
				cssInput: 'form_input',
				stripCssField: true,
				attributes: {type:'text', placeholder: _('Conditinal input'), name:'conditional', id: appRun.main1.fieldConditional},
			},
			input_multiple: {
				type: 'INPUT',
				order: 90,
				cssField: 'form_div',
				cssInput: 'form_input',
				stripCssField: true,
				multiField: true,
				attributes: {type:'text', placeholder: _('Multiple input'), name:'multiple_input', id: 'f' + appUtilRandomUuid()},
			},
			submit: {
				type: 'BUTTON',
				cssField: 'form_div',
				cssInput: 'form_button',
				order: 999,
				extra: {text:'Next', name: _('Submit'), action: 'submit'}
			}
		}
	};

/*
	// Example how to hide certain fields based on certain properties.
	// You can show cetain fields wich are hidden by default the same way.
	// You'd probably do this in an IF statment
	params.fields.select1.enabled = false;
	params.fields.select2.enabled = false;
*/

	// You can also fill the values for certain inputs with data, received from an AJAX call or saved in the runtime obect.
	// Access the field FIELD_NAME as field=appRun.forms[appRun.main1.formId].fields.FIELD_NAME (where appRun.main1.formId is set above), 
	// then set value depending on the input type: e.g., for text input set the field.extra.text='...'. See README for other fields.

	var form = new guidoForm(params, function(error, result) {
		// Pass any error to the error handler - see appUtilErrorHandler() in /app/js/util.js
		if (error) {
			appUtilErrorHandler(0, error.validator.error);
			return;
		}

/*
		// Here you can set values if certan fields were not filled.
		if (! result.hasOwnProperty('radio'))
			result.radio= 2;
*/

/*
		// If you have modified the runtime object, save it
		guidoLsSave();
*/

/*
		// Example AJAX call with the data
		// Adds an authentication header withe session cookie - see appUtilAuthHeader() in /app/js/util.js
		// Shows the spinned before sending the data - see appUtilSpinnerShow() in /app/js/util.js
		var jqXHR = $.ajax({
			type: 'POST',
			url: appConf.api.url + '/some_endpoint',
			data: {q: JSON.stringify(result)},
			beforeSend: function (request) {
				appUtilAuthHeader(request);
				appUtilSpinnerShow();
			},
		})
		.done(function() {
			// Hide the spinner - see appUtilSpinnerHide() in /app/js/util.js
			appUtilSpinnerHide();

			// Extract the response and do something based on it
			var resp = appUtilExtractResponse(jqXHR);
			if (resp) 
				alert(resp);

			// If you have modified the runtime object, save it
			guidoLsSave();

			// Do othe stuff here, like, more API calls

			// Go to next section
			guidoLoadSection(nextSection);
	 	})
		.fail(function(jqXHR) {
			// Call the error handler - see appUtilErrorHandler() in /app/js/util.js
			appUtilErrorHandler(jqXHR.status, "Error submitting data.");
		});
*/

console.log(result);
	});
}

// On change of "select1" drop down, change the values in the "select2" drop-down
function appOnChangeSelect1() {
	// Read the current value of the drop-down
	// NB: values are returned as strings even if they contain only numbers.
	var elementSelect1 = document.getElementById(appRun.main1.fieldSelect1);
	var valueSelect1 = elementSelect1.options[elementSelect1.selectedIndex].value;

	// Set new values in the form object
	switch (valueSelect1) {
		case '1':
			appRun.forms[appRun.main1.formId].fields.select2.extra.options = [
				{value:'1', text: _('Choice D')},
				{value:'2', text: _('Choice E')},
			];
			break;
		case '2':
			appRun.forms[appRun.main1.formId].fields.select2.extra.options = [
				{value:'3', text: _('Choice F')},
				{value:'4', text: _('Choice G')},
			];
			break;
		case '3':
			appRun.forms[appRun.main1.formId].fields.select2.extra.options = [
				{value:'5', text: _('Choice H')},
				{value:'6', text: _('Choice I')},
			];
			break;
	}

	// Render the form
	appRun.forms[appRun.main1.formId].render();
};

// Example helper function

function appOnChangeCheckbox2() {
	// Set element 'conditional' to be visible.
	// You need a handler to the ID of the target field
	var elementCheckbox2 = document.getElementById(appRun.main1.fieldCheckbox2);
	var valueCheckbox2 = elementCheckbox2.checked;

	if (valueCheckbox2)
		appRun.forms[appRun.main1.formId].setEnabled(appRun.main1.fieldConditional, true);
	else
		appRun.forms[appRun.main1.formId].setEnabled(appRun.main1.fieldConditional, false);

	// Instead of setEnabled() method you can set the 'enable' property of the form field and then call render() manually. 
	// See appOnChangeSelect1() above for a similar example.
};


/**
 * Per-template unloading method. 
 * Will be called whenever the template named 'main1' is detached from a parent. 
 */
function appUnloadTemplate_main1() {
	appRun.logger.debug('Entering function appUnloadTemplate_main1()...');
	// Add your code below
}

