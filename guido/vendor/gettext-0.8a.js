/**
 * Pure Javascript implementation of Uniforum message translation.
 * @author Joshua I. Miller unrtst@cpan.org
 * @author Assen Totin assen.totin@gmail.com
 * 
 * Original copyright (C) 2008 Joshua I. Miller <unrtst@cpan.org>, all rights reserved.
 * Modified for the GUIdo project, copyright (C) 2014 Assen Totin, assen.totin@gmail.com.
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Library General Public License as published
 * by the Free Software Foundation; either version 2, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Library General Public License for more details.
 * 
 * You should have received a copy of the GNU Library General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307,
 * USA.
 */

function Gettext (locale_data) {
	this.domain = 'guido';
	this.locale_data = locale_data;
	this._locale_data = {};
	this.context_glue = "\004";

	var rv = this.locale_data;

	this.load_lang_json = function(locale_data) {
		var domain = null;
		
		if (typeof(this._locale_data) == 'undefined')
			this._locale_data = { };
	
		// suck in every domain defined in the supplied data
		for (domain in locale_data) {
			// skip empty specs (flexibly)
			if ((! locale_data.hasOwnProperty(domain)) || (! this.isValidObject(locale_data[domain])))
				continue;
			// skip if it has no msgid's
			var has_msgids = false;
			for (var msgid in locale_data[domain]) {
				has_msgids = true;
				break;
			}
			if (! has_msgids) continue;
	
			// grab shortcut to data
			var data = locale_data[domain];
	
			// if they specify a blank domain, default to "guido"
			if (domain == "") domain = this.domain;

			// init the data structures
			if (! this.isValidObject(this._locale_data[domain]) )
				this._locale_data[domain] = { };
			if (! this.isValidObject(this._locale_data[domain].head) )
				this._locale_data[domain].head = { };
			if (! this.isValidObject(this._locale_data[domain].msgs) )
				this._locale_data[domain].msgs = { };

			for (var key in data) {
				if (key == "") {
					var header = data[key];
					for (var head in header) {
						var h = head.toLowerCase();
						this._locale_data[domain].head[h] = header[head];
					}
				} 
				else {
					this._locale_data[domain].msgs[key] = data[key];
				}
			}
		}
	
		// build the plural forms function
		for (domain in this._locale_data) {
			if (this.isValidObject(this._locale_data[domain].head['plural-forms']) &&
				typeof(this._locale_data[domain].head.plural_func) == 'undefined') {
				// untaint data
				var plural_forms = this._locale_data[domain].head['plural-forms'];
				var pf_re = new RegExp('^(\\s*nplurals\\s*=\\s*[0-9]+\\s*;\\s*plural\\s*=\\s*(?:\\s|[-\\?\\|&=!<>+*/%:;a-zA-Z0-9_\(\)])+)', 'm');
				if (pf_re.test(plural_forms)) {
					//ex english: "Plural-Forms: nplurals=2; plural=(n != 1);\n"
					//pf = "nplurals=2; plural=(n != 1);";
					//ex russian: nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10< =4 && (n%100<10 or n%100>=20) ? 1 : 2)
					//pf = "nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)";
	
					var pf = this._locale_data[domain].head['plural-forms'];
					if (! /;\s*$/.test(pf)) pf = pf.concat(';');
					/* We used to use eval, but it seems IE has issues with it.
					 * We now use "new Function", though it carries a slightly
					 * bigger performance hit.
					var code = 'function (n) { var plural; var nplurals; '+pf+' return { "nplural" : nplurals, "plural" : (plural === true ? 1 : plural ? plural : 0) }; };';
					this._locale_data[domain].head.plural_func = eval("("+code+")");
					*/
					var code = 'var plural; var nplurals; '+pf+' return { "nplural" : nplurals, "plural" : (plural === true ? 1 : plural ? plural : 0) };';
					this._locale_data[domain].head.plural_func = new Function("n", code);
				} 
				else {
					throw new Error("Syntax error in language file. Plural-Forms header is invalid ["+plural_forms+"]");
				}   
	
			// default to english plural form
			} 
			else if (typeof(this._locale_data[domain].head.plural_func) == 'undefined') {
				this._locale_data[domain].head.plural_func = function (n) {
					var p = (n != 1) ? 1 : 0;
					return { 'nplural' : 2, 'plural' : p };
				};
			} // else, plural_func already created
		}
	};
		
	this.parse_po = function(data) {
		var rv = {};
		var buffer = {};
		var lastbuffer = "";
		var errors = [];
		var lines = data.split("\n");
		for (var i=0; i<lines.length; i++) {
			// chomp
			lines[i] = lines[i].replace(/(\n|\r)+$/, '');
	
			var match;
	
			// Empty line / End of an entry.
			if (/^$/.test(lines[i])) {
				if (typeof(buffer['msgid']) != 'undefined') {
					var msg_ctxt_id = (typeof(buffer['msgctxt']) != 'undefined' && buffer['msgctxt'].length) ?
						buffer['msgctxt']+this.context_glue+buffer['msgid'] :
						buffer['msgid'];
					var msgid_plural = (typeof(buffer['msgid_plural']) != 'undefined' && buffer['msgid_plural'].length) ?
						buffer['msgid_plural'] :
						null;
	
					// find msgstr_* translations and push them on
					var trans = [];
					for (var str in buffer) {
						var match;
						if (match = str.match(/^msgstr_(\d+)/))
							trans[parseInt(match[1])] = buffer[str];
					}
					trans.unshift(msgid_plural);
	
					// only add it if we've got a translation
					// NOTE: this doesn't conform to msgfmt specs
					if (trans.length > 1) rv[msg_ctxt_id] = trans;
	
					buffer = {};
					lastbuffer = "";
				}
	
			// comments
			} else if (/^#/.test(lines[i])) {
				continue;
	
			// msgctxt
			} else if (match = lines[i].match(/^msgctxt\s+(.*)/)) {
				lastbuffer = 'msgctxt';
				buffer[lastbuffer] = this.parse_po_dequote(match[1]);
	
			// msgid
			} else if (match = lines[i].match(/^msgid\s+(.*)/)) {
				lastbuffer = 'msgid';
				buffer[lastbuffer] = this.parse_po_dequote(match[1]);
	
			// msgid_plural
			} else if (match = lines[i].match(/^msgid_plural\s+(.*)/)) {
				lastbuffer = 'msgid_plural';
				buffer[lastbuffer] = this.parse_po_dequote(match[1]);
	
			// msgstr
			} else if (match = lines[i].match(/^msgstr\s+(.*)/)) {
				lastbuffer = 'msgstr_0';
				buffer[lastbuffer] = this.parse_po_dequote(match[1]);
	
			// msgstr[0] (treak like msgstr)
			} else if (match = lines[i].match(/^msgstr\[0\]\s+(.*)/)) {
				lastbuffer = 'msgstr_0';
				buffer[lastbuffer] = this.parse_po_dequote(match[1]);
	
			// msgstr[n]
			} else if (match = lines[i].match(/^msgstr\[(\d+)\]\s+(.*)/)) {
				lastbuffer = 'msgstr_'+match[1];
				buffer[lastbuffer] = this.parse_po_dequote(match[2]);
	
			// continued string
			} else if (/^"/.test(lines[i])) {
				buffer[lastbuffer] += this.parse_po_dequote(lines[i]);
	
			// something strange
			} else {
				errors.push("Strange line ["+i+"] : "+lines[i]);
			}
		}
	
		// handle the final entry
		if (typeof(buffer['msgid']) != 'undefined') {
			var msg_ctxt_id = (typeof(buffer['msgctxt']) != 'undefined' &&
							   buffer['msgctxt'].length) ?
							  buffer['msgctxt']+this.context_glue+buffer['msgid'] :
							  buffer['msgid'];
			var msgid_plural = (typeof(buffer['msgid_plural']) != 'undefined' &&
								buffer['msgid_plural'].length) ?
							   buffer['msgid_plural'] :
							   null;
	
			// find msgstr_* translations and push them on
			var trans = [];
			for (var str in buffer) {
				var match;
				if (match = str.match(/^msgstr_(\d+)/))
					trans[parseInt(match[1])] = buffer[str];
			}
			trans.unshift(msgid_plural);
	
			// only add it if we've got a translation
			// NOTE: this doesn't conform to msgfmt specs
			if (trans.length > 1) rv[msg_ctxt_id] = trans;
	
			buffer = {};
			lastbuffer = "";
		}
	
		// parse out the header
		if (rv[""] && rv[""][1]) {
			var cur = {};
			var hlines = rv[""][1].split(/\\n/);
			for (var i=0; i<hlines.length; i++) {
				if (! hlines.length) continue;
	
				var pos = hlines[i].indexOf(':', 0);
				if (pos != -1) {
					var key = hlines[i].substring(0, pos);
					var val = hlines[i].substring(pos +1);
					var keylow = key.toLowerCase();
	
					if (cur[keylow] && cur[keylow].length) {
						errors.push("SKIPPING DUPLICATE HEADER LINE: "+hlines[i]);
					} else if (/#-#-#-#-#/.test(keylow)) {
						errors.push("SKIPPING ERROR MARKER IN HEADER: "+hlines[i]);
					} else {
						// remove begining spaces if any
						val = val.replace(/^\s+/, '');
						cur[keylow] = val;
					}
	
				} else {
					errors.push("PROBLEM LINE IN HEADER: "+hlines[i]);
					cur[hlines[i]] = '';
				}
			}
	
			// replace header string with assoc array
			rv[""] = cur;
		} else {
			rv[""] = {};
		}
	
		// TODO: XXX: if there are errors parsing, what do we want to do?
		// GNU Gettext silently ignores errors. So will we.
		// alert( "Errors parsing po file:\n" + errors.join("\n") );
	
		return rv;
	};
	
	
	this.parse_po_dequote = function(str) {
		var match;
		if (match = str.match(/^"(.*)"/)) {
			str = match[1];
		}
		// unescale all embedded quotes (fixes bug #17504)
		str = str.replace(/\\"/g, "\"");
		return str;
	};
	
	// gettext
	this.gettext = function (msgid) {
		var msgctxt;
		var msgid_plural;
		var n;
		var category;
		return this.dcnpgettext(null, msgctxt, msgid, msgid_plural, n, category);
	};
	
	this.dgettext = function (domain, msgid) {
		var msgctxt;
		var msgid_plural;
		var n;
		var category;
		return this.dcnpgettext(domain, msgctxt, msgid, msgid_plural, n, category);
	};
	
	this.dcgettext = function (domain, msgid, category) {
		var msgctxt;
		var msgid_plural;
		var n;
		return this.dcnpgettext(domain, msgctxt, msgid, msgid_plural, n, category);
	};
	
	// ngettext
	this.ngettext = function (msgid, msgid_plural, n) {
		var msgctxt;
		var category;
		return this.dcnpgettext(null, msgctxt, msgid, msgid_plural, n, category);
	};
	
	this.dngettext = function (domain, msgid, msgid_plural, n) {
		var msgctxt;
		var category;
		return this.dcnpgettext(domain, msgctxt, msgid, msgid_plural, n, category);
	};
	
	this.dcngettext = function (domain, msgid, msgid_plural, n, category) {
		var msgctxt;
		return this.dcnpgettext(domain, msgctxt, msgid, msgid_plural, n, category, category);
	};
	
	// pgettext
	this.pgettext = function (msgctxt, msgid) {
		var msgid_plural;
		var n;
		var category;
		return this.dcnpgettext(null, msgctxt, msgid, msgid_plural, n, category);
	};
	
	this.dpgettext = function (domain, msgctxt, msgid) {
		var msgid_plural;
		var n;
		var category;
		return this.dcnpgettext(domain, msgctxt, msgid, msgid_plural, n, category);
	};
	
	this.dcpgettext = function (domain, msgctxt, msgid, category) {
		var msgid_plural;
		var n;
		return this.dcnpgettext(domain, msgctxt, msgid, msgid_plural, n, category);
	};
	
	// npgettext
	this.npgettext = function (msgctxt, msgid, msgid_plural, n) {
		var category;
		return this.dcnpgettext(null, msgctxt, msgid, msgid_plural, n, category);
	};
	
	this.dnpgettext = function (domain, msgctxt, msgid, msgid_plural, n) {
		var category;
		return this.dcnpgettext(domain, msgctxt, msgid, msgid_plural, n, category);
	};
	
	// this has all the options, so we use it for all of them.
	this.dcnpgettext = function (domain, msgctxt, msgid, msgid_plural, n, category) {
		if (! this.isValidObject(msgid)) return '';
	
		var plural = this.isValidObject(msgid_plural);
		var msg_ctxt_id = this.isValidObject(msgctxt) ? msgctxt+this.context_glue+msgid : msgid;
	
		var domainname = this.isValidObject(domain)	  ? domain :
						 this.isValidObject(this.domain) ? this.domain :
														   'messages';
	
		// category is always LC_MESSAGES. We ignore all else
		var category_name = 'LC_MESSAGES';
		var category = 5;
	
		var locale_data = new Array();
		if (typeof(this._locale_data) != 'undefined' &&
			this.isValidObject(this._locale_data[domainname])) {
			locale_data.push( this._locale_data[domainname] );
	
		} else if (typeof(this._locale_data) != 'undefined') {
			// didn't find domain we're looking for. Search all of them.
			for (var dom in this._locale_data) {
				locale_data.push( this._locale_data[dom] );
			}
		}
	
		var trans = [];
		var found = false;
		var domain_used; // so we can find plural-forms if needed
		if (locale_data.length) {
			for (var i=0; i<locale_data.length; i++) {
				var locale = locale_data[i];
				if (this.isValidObject(locale.msgs[msg_ctxt_id])) {
					// make copy of that array (cause we'll be destructive)
					for (var j=0; j<locale.msgs[msg_ctxt_id].length; j++) {
						trans[j] = locale.msgs[msg_ctxt_id][j];
					}
					trans.shift(); // throw away the msgid_plural
					domain_used = locale;
					found = true;
					// only break if found translation actually has a translation.
					if ( trans.length > 0 && trans[0].length != 0 )
						break;
				}
			}
		}
	
		// default to english if we lack a match, or match has zero length
		if ( trans.length == 0 || trans[0].length == 0 ) {
			trans = [ msgid, msgid_plural ];
		}
	
		var translation = trans[0];
		if (plural) {
			var p;
			if (found && this.isValidObject(domain_used.head.plural_func) ) {
				var rv = domain_used.head.plural_func(n);
				if (! rv.plural) rv.plural = 0;
				if (! rv.nplural) rv.nplural = 0;
				// if plurals returned is out of bound for total plural forms
				if (rv.nplural <= rv.plural) rv.plural = 0;
				p = rv.plural;
			} else {
				p = (n != 1) ? 1 : 0;
			}
			if (this.isValidObject(trans[p]))
				translation = trans[p];
		}

		return translation;
	};
	
	
	/*
	
	  string : a string that potentially contains formatting characters.
	  argument_array : an array of positional replacement values
	
	This is a utility method to provide some way to support positional parameters within a string, as javascript lacks a printf() method.
	
	The format is similar to printf(), but greatly simplified (ie. fewer features).
	
	Any percent signs followed by numbers are replaced with the corrosponding item from the B<argument_array>.
	
	Example:
	
		var string = "%2 roses are red, %1 violets are blue";
		var args   = new Array("10", "15");
		var result = this.strargs(string, args);
		// result is "15 roses are red, 10 violets are blue"
	
	The format numbers are 1 based, so the first itme is %1.
	
	A lone percent sign may be escaped by preceeding it with another percent sign.
	
	A percent sign followed by anything other than a number or another percent sign will be passed through as is.
	
	Some more examples should clear up any abmiguity. The following were called with the orig string, and the array as Array("[one]", "[two]") :
	
	  orig string "blah" becomes "blah"
	  orig string "" becomes ""
	  orig string "%%" becomes "%"
	  orig string "%%%" becomes "%%"
	  orig string "%%%%" becomes "%%"
	  orig string "%%%%%" becomes "%%%"
	  orig string "tom%%dick" becomes "tom%dick"
	  orig string "thing%1bob" becomes "thing[one]bob"
	  orig string "thing%1%2bob" becomes "thing[one][two]bob"
	  orig string "thing%1asdf%2asdf" becomes "thing[one]asdf[two]asdf"
	  orig string "%1%2%3" becomes "[one][two]"
	  orig string "tom%1%%2%aDick" becomes "tom[one]%2%aDick"
	
	This is especially useful when using plurals, as the string will nearly always contain the number.
	
	It's also useful in translated strings where the translator may have needed to move the position of the parameters.
	
	For example:
	
	  var count = 14;
	  this.strargs( gt.ngettext('one banana', '%1 bananas', count), [count] );
	
	NOTE: this may be called as an instance method, or as a class method.
	
	  // instance method:
	  var gt = new Gettext(params);
	  gt.strargs(string, args);
	
	  // class method:
	  this.strargs(string, args);
	
	*/
	/* utility method, since javascript lacks a printf */
	this.strargs = function (str, args) {
		// make sure args is an array
		if ( null == args ||
			 'undefined' == typeof(args) ) {
			args = [];
		} else if (args.constructor != Array) {
			args = [args];
		}
	
		// NOTE: javascript lacks support for zero length negative look-behind
		// in regex, so we must step through w/ index.
		// The perl equiv would simply be:
		//	$string =~ s/(?<!\%)\%([0-9]+)/$args[$1]/g;
		//	$string =~ s/\%\%/\%/g; # restore escaped percent signs
	
		var newstr = "";
		while (true) {
			var i = str.indexOf('%');
			var match_n;
	
			// no more found. Append whatever remains
			if (i == -1) {
				newstr += str;
				break;
			}
	
			// we found it, append everything up to that
			newstr += str.substr(0, i);
	
			// check for escpaed %%
			if (str.substr(i, 2) == '%%') {
				newstr += '%';
				str = str.substr((i+2));
	
			// % followed by number
			} else if ( match_n = str.substr(i).match(/^%(\d+)/) ) {
				var arg_n = parseInt(match_n[1]);
				var length_n = match_n[1].length;
				if ( arg_n > 0 && args[arg_n -1] != null && typeof(args[arg_n -1]) != 'undefined' )
					newstr += args[arg_n -1];
				str = str.substr( (i + 1 + length_n) );
	
			// % followed by some other garbage - just remove the %
			} else {
				newstr += '%';
				str = str.substr((i+1));
			}
		}
	
		return newstr;
	};
	
		
	/* verify that an object exists and is valid */
	this.isValidObject = function (thisObject) {
		if (null == thisObject)
			return false; 
		else if ('undefined' == typeof(thisObject) )
			return false;
		
		return true;
	};
	
	// MAIN METHOD a.k.a. constructor
	
	// For PO files: pre-process the PO into JSON  
	var parsed = this.parse_po(this.locale_data);		  
	rv = {};
	// munge domain into/out of header
	if (parsed) {
		if (! parsed[""]) parsed[""] = {};
		if (! parsed[""]["domain"]) parsed[""]["domain"] = this.domain;
		domain = parsed[""]["domain"];
		rv[domain] = parsed;
	}
	
	// Parse JSON into internal structure
	this.load_lang_json(rv);
	
	if (typeof(this._locale_data[this.domain]) == 'undefined') {
		throw new Error("Error: Gettext 'locale_data' does not contain the domain '"+this.domain+"'");
	}
}
