/**
 * Per-template loading method. 
 * Will be called whenever the template named 'menu1' is attached to a parent. 
 */
function appLoadTemplate_menu1() {
	appRun.logger.debug('Entering function appLoadTemplate_menu1()...');

	// Load all images (images will be sought by class; class name should match image name)
	guidoRenderImages();

/*
	// To load a particular image and/or to use classes or IDs that differ from image names, 
	// use the guidoImageElementId(id, image) or guidoImageElementClass(class, image) funcitons like this:
	guidoImageElementClass("test_image", "frog.gif");
*/
}


/**
 * Per-template unloading method. 
 * Will be called whenever the template named 'menu1' is detached to a parent. 
 */
function appUnloadTemplate_menu1() {
	appRun.logger.debug('Entering function appUnloadTemplate_menu1()...');
	// Add your code below
}
