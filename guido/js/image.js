/**
 * GUIdo images loading funcitons.
 * 
 * @author Assen Totin assen.totin@gmail.com
 * 
 * Created for the GUIdo project, copyright (C) 2014 Assen Totin, assen.totin@gmail.com 
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/**
 * Set image from local storage into provided DOM element.
 * @param element Object DOM element to use.
 * @param file_name String The name of the file to set. 
 */
function guidoImageElement(element, file_name) {
	var extension = guidoGetFileExtension(file_name);
	var mime_type = guidoGetMimeType(extension);
	element.setAttribute( 'src', 'data:' +  mime_type + ';base64,' + guidoRun.images[file_name]);	
}


/**
 * Set image from local storage into DOM element, specified by its ID.
 * @param element_id String ID of the DOM element to use.
 * @param file_name String The name of the file to set. 
 */
function guidoImageElementId(element_id, file_name) {
	guidoImageElement(document.getElementById(element_id), file_name);
}


/**
 * Set image from local storage into all DOM elements, specified by their tag
 * @param tag String HTML tag to use.
 * @param file_name String The name of the file to set. 
 */
function guidoImageElementTag(tag, file_name) {
	var elements = document.getElementsByTag(tag);
	for (var i=0; i<elements.length; i++)
		guidoImageElement(element, file_name);
}


/**
 * Set image from local storage into all DOM elements, specified by their class name
 * @param class_name String Style name to use.
 * @param file_name String The name of the file to set. 
 */
function guidoImageElementClass(class_name, file_name) {
    var elements = document.getElementsByTagName('*'), i;
    for (i in elements) {
        if((' ' + elements[i].className + ' ').indexOf(' ' + class_name + ' ')  > -1)
        	guidoImageElement(elements[i], file_name);
    }
}

/**
 * Render all images
 */
function guidoRenderImages() {
	var images = Object.keys(guidoRun.images);
	for (var i=0; i< images.length; i++) {
		guidoImageElementClass(images[i], images[i]);
	}
}

