"use strict;"

var util = require("util");
var MongoClient = require("mongodb").MongoClient,
	format = require("util").format;
var PATTreeDB = require("pat-tree-db");

var tree;
var posts;

MongoClient.connect("mongodb://localhost/murmur-analytics", function(err, db) {
	if(err) {
		console.log(err);
	} else {
		var postCollection = db.collection("post");
		postCollection.find().sort({createdAt: -1}).limit().toArray(function(err, posts1) {
			if(err) throw err;
			posts = posts1;
			db.close();
			MongoClient.connect("mongodb://localhost/pat-tree", function(err, db) {
				postCollection = db.collection("post");				
				var counter = 0;
				for(var i = 0; i < posts.length; i++) {
					postCollection.insert({content: posts[i].content}, function(err, result) {
						if(err) throw err;
						counter++;
						if(counter == posts.length) {
							console.log("done");
							db.close();
						}
					})
				}
			})	
			/*
			console.log("post count: " + posts.length);
			var connection = {adapter:'sails-mongo', url:'mongodb://pattree:pattree@ds045057.mongolab.com:45057/pat-tree'};
			PATTreeDB.connect(connection, function(tree1) {
				tree1._resetDb().then(function(tree2) {
					tree = tree2;
					var docs = [];
					for(var i = 0; i < posts.length; i++) {
						docs.push(posts[i].content);
					}
					return tree.addAllDocuments(docs);
				}).then(function() {
					console.log("done");
					tree.close();
				})
			})
		*/
		})
	}
});
