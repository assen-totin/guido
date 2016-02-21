/**
 * Per-template loading method. 
 * Will be called whenever the template named 'main3' is attached to a parent. 
 */
function appLoadTemplate_main3() {
	appRun.logger.debug('Entering function appLoadTemplate_main3()...');
	// Add your code below
}

/**
 * Per-template unloading method. 
 * Will be called whenever the template named 'main3' is detached from a parent. 
 */
function appUnloadTemplate_main3() {
	appRun.logger.debug('Entering function appUnloadTemplate_main3()...');
	// Add your code below
}

/**
 * Spinner showing function
 */
function appShowSpinner() {
	appUtilSpinnerShow();

	setTimeout(function(){
		appUtilSpinnerHide();
	}, 5000);
}


