/*\
title: $:/plugins/tiddlywiki/asciidoctor/wrapper.js
type: application/javascript
module-type: parser

Wraps up the Asciidoctor.js parser for use in TiddlyWiki5

TODO: Export to my namespace
https://tiddlywiki.com/dev/static/Developing%2520plugins%2520using%2520Node.js%2520and%2520GitHub.html

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var asciidoctor_parser = require("$:/plugins/tiddlywiki/asciidoctor/asciidoctor")();
var jsonml = require("$:/plugins/tiddlywiki/asciidoctor/jsonml-dom");

var CONFIG_DIALECT_TIDDLER = "$:/config/markdown/dialect",
	DEFAULT_DIALECT = "Gruber";

function transformNodes(nodes) {
	var results = [];
	for(var index=0; index<nodes.length; index++) {
		results.push(transformNode(nodes[index]));
	}
	return results;
}

function transformNode(node) {
	if($tw.utils.isArray(node)) {
		var p = 0,
			widget = {type: "element", tag: node[p++]};
		if(!$tw.utils.isArray(node[p]) && typeof(node[p]) === "object") {
			widget.attributes = {};
			$tw.utils.each(node[p++],function(value,name) {
				widget.attributes[name] = {type: "string", value: value};
			});
		}
		widget.children = transformNodes(node.slice(p++));
		// Massage images into the image widget
		if(widget.tag === "img") {
			widget.type = "image";
			if(widget.attributes.alt) {
				widget.attributes.tooltip = widget.attributes.alt;
				delete widget.attributes.alt;
			}
			if(widget.attributes.src) {
				widget.attributes.source = widget.attributes.src;
				delete widget.attributes.src;
			}
		}
		// Convert internal links to proper wikilinks
		if (widget.tag === "a" && widget.attributes.href.value[0] === "#") {
			widget.type = "link";
			widget.attributes.to = widget.attributes.href;
			if (widget.attributes.to.type === "string") {
				//Remove '#' before conversion to wikilink
				widget.attributes.to.value = widget.attributes.to.value.substr(1);
			}
			//Children is fine
			delete widget.tag;
			delete widget.attributes.href;
		}
		return widget;
	} else {
		return {type: "text", text: node};
	}
}

var AsciidoctorParser = function(type,text,options) {
	var dialect = options.wiki.getTiddlerText(CONFIG_DIALECT_TIDDLER,DEFAULT_DIALECT),
		html_text = asciidoctor_parser.convert(text),
        node_tree = jsonml.fromHTMLText(html_text, null),
        tiddler_tree = transformNodes(node_tree);
    this.tree = tiddler_tree;
};

/*

[ 'html',
  [ 'p', 'something' ],
  [ 'h1',
    'heading and ',
    [ 'strong', 'other' ] ] ]

*/

exports["text/asciidoc"] = AsciidoctorParser;

})();
