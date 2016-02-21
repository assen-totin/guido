/**
 * Per-template loading method. 
 * Will be called whenever the template named 'main4' is attached to a parent. 
 */
function appLoadTemplate_main4() {
	appRun.logger.debug('Entering function appLoadTemplate_main4()...');
	// Add your code below
}


/**
 * Per-template unloading method. 
 * Will be called whenever the template named 'main4' is detached from a parent. 
 */
function appUnloadTemplate_main4() {
	appRun.logger.debug('Entering function appUnloadTemplate_main4()...');
	// Add your code below
}

/**
 * Modal dialogue showing function
 */
function appShowModal() {
	// Here you can fetch the desired content for the modal dialogue from an API
	// We'll use static text as an example.
	var html = "<p>Sample modal dialogue text.</p>";
	html += "<p>Click the button to close the modal dialogue.</p>";
	html += "<button onClick=appUtilModalHide();>Click me!</button>";

	appUtilModalShow(html);
}
