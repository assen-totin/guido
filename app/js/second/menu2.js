/**
 * Per-template loading method. 
 * Will be called whenever the template named 'menu2' is attached to a parent. 
 */
function appLoadTemplate_menu2() {
	appRun.logger.debug('Entering function appLoadTemplate_menu1()...');

	// Load all images (images will be sought by class; class name should match image name)
	guidoRenderImages();
}

/**
 * Per-template unloading method. 
 * Will be called whenever the template named 'menu2' is detached from a parent. 
 */
function appUnloadTemplate_menu2() {
	appRun.logger.debug('Entering function appUnloadTemplate_menu2()...');
	// Add your code below
}


