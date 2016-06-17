"use strict;"

var util = require("util");
var utils = require("./utils.js")

var MongoClient = require("mongodb").MongoClient,
	format = require("util").format;
var PATTree = require('pat-tree');


var start;
var end;


MongoClient.connect("mongodb://localhost/pat-tree", function(err, db) {
	start = new Date();
	db.collection("header").find().toArray(function(err, headers) {
		console.log("done loading header");
		db.collection("documents").find().toArray(function(err, documents) {
			console.log("done loading documents")
			db.collection("tree").find().toArray(function(err, tree) {
				console.log("done loading tree");
				var json = {};
				json.header = headers[0];
				json.documents = documents;
				json.tree = tree;
				//console.log(json.header);
				//console.log(json.tree);


				var patTree = new PATTree();
				patTree.reborn(json);
				console.log("done reborn");
				var SLPs = patTree.extractSLP(5, 0.3, true);
				console.log(SLPs);

				//patTree.printTreeContent(true, true);

				end = new Date();
				var time = utils.getElpasedTime(start, end);
				console.log(time);

				json = patTree.toJSON();
				console.log("done convert to json");

				//console.log(patTree.maxSistringLength);
				//console.log(patTree.index);
				//patTree.printTreeContent(true, false);
				//var SLPs = patTree.extractSLP(3, 0.3);
				//console.log(SLPs);
			})
		})
	})	
})
