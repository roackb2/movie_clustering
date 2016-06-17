
"use strict;"
var Promise = require('bluebird');
var util = require("util");
var mongodb = Promise.promisifyAll(require('mongodb'));
var MongoClient = mongodb.MongoClient,
	format = require("util").format;
var PATTree = require("pat-tree");
var utils = require("./utils.js")

var argvs = process.argv;
var params = argvs.slice(2, argvs.length);

var limit = parseInt(params[0]);
console.log(limit);

var posts;

/*
MongoClient.connect("mongodb://localhost/pat-tree", function(err, db) {
	if(err) throw err;
	postCollection = db.collection("post");
	headerCollection = db.collection("header");
	documentCollection = db.collection("documents");
	treeCollection = db.collection("tree");
	promises = [];
	promises.push(headerCollection.drop());
	promises.push(documentCollection.drop());
	promises.push(treeCollection.drop());
	Promise.all(promises).then(function() {
		postCollection.find({}, {createdAt: -1, limit: limit}).toArray(function(err, posts1) {
			posts = posts1;
			//console.log(posts);
			var tree = new PATTree();
			for(var i = 0; i < posts.length; i++) {
				tree.addDocument(posts[i].content);
				console.log("done adding No." + i + " item");
			}
			var json = tree.toJSON();
			//console.log(json);
			var counter = 0;
			var max = json.documents.length + json.tree.length + 1;
			console.log(json.header);
			console.log(json.documents);
			//console.log(json.tree);

			
			headerCollection.insert(json.header, function(err, result) {
				if(err) throw err;
				counter++;
			});
			for(var i = 0; i < json.documents.length; i++) {
				//console.log(json.documents[i]);
				documentCollection.insert(json.documents[i], function(err, result) {
					if(err) throw err;
					counter++;
					if(counter == max) {
						console.log("done");
						db.close();						
					}
				});
			}
			for(var i = 0; i < json.tree.length; i++) {
				//console.log(json.tree[i]);
				treeCollection.insert(json.tree[i], function(err, result) {
					if(err) throw err;
					counter++;
					if(counter == max) {
						console.log("done");
						db.close();						
					}					
				});
			}
			//console.log(json);
			return Promise.all(promises);
			//db.close();	
			
		})
	}).then(function() {

	})	

})
*/


MongoClient.connect("mongodb://localhost/murmur-analytics", function(err, db) {
	if(err) throw err;
	var postCollection = db.collection("post");
	postCollection.find({}, {createdAt: -1, limit:limit}).toArray(function(err, posts1) {
		if(err) throw err;
		posts = posts1;
		var tree = new PATTree();
		for(var i = 0; i < posts.length; i++) {
			tree.addDocument(posts[i].content);
		}

		var json = tree.toJSON();

		tree.reborn(json);

		tree.printTreeContent(true, false);
		
		db.close();
		/*
		MongoClient.connect("mongodb://localhost/pat-tree", function(err, db) {
			if(err) throw err;
			postCollection = db.collection("post");
			var counter = 0;			
			for(var i = 0; i < posts.length; i++) {
				postCollection.insert(posts[i], function(err, result) {
					if(err) throw err;
					counter++;
					if(counter == posts.length) {
						db.close();
					}
				})
			}
		})
		*/
	})
})
