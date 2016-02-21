// Utility functions for Guido App

// Show spinner, remember whn it was shown
function appUtilSpinnerShow() {
	// Set the spinner image in the modal dialogue
	var el = document.getElementById('modal_contents');
	el.innerHTML = "<img class='spinner_image' src='#'>";

	// Render the spinner image
	guidoImageElementClass("spinner_image", "spinner.gif");

	// Show the spinner
	$('.table-modal').css('visibility','visible');

	// Record starting time
	appRun.spinner.now = Date.now();
}

// Hide spinner: delay hiding if it was shown too soon (to avoid unpleassant flicker)
function appUtilSpinnerHide() {
	var delay = 0;
	var diff = Date.now() - appRun.spinner.now;

	if (diff < appConf.spinner.minShowTime)
		delay = appConf.spinner.minShowTime - diff;

	setTimeout(function(){
		$('.table-modal').css('visibility','hidden');
	}, delay);
}

// Show modal dialogue
function appUtilModalShow(html) {
	var el = document.getElementById('modal_contents');
	el.innerHTML = html;

	$('.table-modal').css('visibility','visible');
}

// Hide modal dialogue
function appUtilModalHide(html) {
	$('.table-modal').css('visibility','hidden');
}

// Add authentication header
function appUtilAuthHeader(request) {
	request.setRequestHeader("X-Session-Id", appRun.cookies.session);
}

// Error handler
function appUtilErrorHandler(code, message) {
	appRun.logger.error(message);

	// Hide spinner if it was visible
	appUtilSpinnerHide();

	if (code == 401) {
		alert(_("You are not logged in."));
		appLogout();
		guidoLoadLayout('dashboard', 'login');
	}
	else
		alert(_("An error has occurred: ") + message);
}


// Response extractor
function appUtilExtractResponse(response) {
	// No news - good news
	if (! response.responseText)
		return null;

	try {
		var fromJson = JSON.parse(response.responseText);
		return fromJson;
	}
	catch(e) {
		// Non-JSON response means error
		appUtilErrorHandler(response.responseText);
		return null;
	}
}

/**
 * Generate a random UUID-4
 */
function appUtilRandomUuid() {
	//var uuid4 = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
	var uuid4 = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(
		/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});

	return uuid4;
}

// Compare two strings as software versions (e.g. 1.2 vs 1.0.7)
function appVersionCompare(v1, v2) {
	// If values are identical, return 0
	if (v1 == v2)
		return 0;

	// Split into parts
	var v1parts = v1.split('.');
	var v2parts = v2.split('.');

	// Make two values to be of the same length (1.0 v 1.2.1)
	while (v1parts.length < v2parts.length) v1parts.push("0");
	while (v2parts.length < v1parts.length) v2parts.push("0");

	for (var i=0; i<v1parts.length; i++) {

		var a = parseInt(v1parts[i], 10);
		var b = parseInt(v2parts[i], 10);

		if (a == b)
			continue;

		if (a > b)
			return 1;

		return -1;
	}
}

// Convert JSON-formatted date to more friendly format
function appDateFromJson(dt) {
	return dt.replace('T', ' ').replace('.000Z', '');
}


