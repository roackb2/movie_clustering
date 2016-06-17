"use strict;"
var Promise = require('bluebird');
var util = require("util");
var utils = require("./utils.js")

var mongodb = Promise.promisifyAll(require('mongodb'));
var MongoClient = mongodb.MongoClient,
	format = require("util").format;
var PATTree = require("pat-tree");

var argvs = process.argv;
var params = argvs.slice(2, argvs.length);

var index = parseInt(params[0]);
//console.log(amount);

var db;
var skip;
var tree;
var posts;
var SLPs = [];
var json;

var start;
var end;
var segmented = [];

MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
	db = db1;
	process.exit(1)
	return db.collection("documents").countAsync();
}).then(function(count) {
	skip = count;
	//console.log(skip);
	
	start = new Date();
	var promises = [
	db.collection("post").find().sort({createdAt: -1}).skip(index).limit(1).toArrayAsync(),
	//db.collection("header").find().toArrayAsync(),
	//db.collection("documents").find().toArrayAsync(),
	//db.collection("tree").find().toArrayAsync(),
	db.collection("slp").find().toArrayAsync(),
	//db.collection("segmentation").find().toArrayAsync()
	]

	return Promise.all(promises);
}).spread(function(dbPosts, /*dbHeaders, dbDocuments, dbTree, */dbSLPs/*, dbSegmentation*/) {
	console.log("done loading collections");
	posts = dbPosts;
	tree = new PATTree();	

	/*
	if(dbHeaders.length != 0) {
		var result = {};
		result.header = dbHeaders[0];
		result.documents = dbDocuments;
		result.tree = dbTree;
		tree.reborn(result);
		console.log("done reborn");
	}*/

	/*
	for(var i = 0; i < posts.length; i++) {	
		tree.addDocument(posts[i].content);
		if(i % 1000 == 0) {
			console.log("done adding No." + i + " item to PAT tree");			
		}
	}
	*/

	//SLPs = tree.extractSLP(5, 0.3, true);
	for(var i = 0; i < dbSLPs.length; i++) {
		SLPs.push(dbSLPs[i].sistring);
	}
	//console.log(SLPs);	

	var result = tree.segmentDoc(posts[0].content, dbSLPs);
	console.log(result);	
	process.exit(1);
	
	/*
	for(var i = 0; i < posts.length; i++) {	
		var doc =  tree.segmentDoc(posts[i].content, dbSLPs);
		segmented.push({content: doc});
		if(i % 100 == 0) {
			console.log("done segmenting No." + i + " post");			
		}
	}
	*/



	
	///process.exit(1);

	/*

	console.log("done adding all " + posts.length + " posts");
	end = new Date();
	var time = utils.getElpasedTime(start, end);

	console.log(time);
	process.exit(1);
	*/

	/*
	SLPs = tree.extractSLP(5, 0.3, true);
	console.log("done extracting SLPs, number: " + SLPs.length);
	json = tree.toJSON();
	console.log("done converting to json");	

	
	for(var i = 0; i < SLPs.length; i++) {
		SLPs[i] = {id: i, name: SLPs[i]};
	}
	*/
	
	
	var promises = [];
	//promises.push(db.collection("header").dropAsync());
	//promises.push(db.collection("documents").dropAsync());
	//promises.push(db.collection("tree").dropAsync());	
	//promises.push(db.collection("slp").dropAsync());

	/*
	if(dbHeaders.length > 0) {
	}
	if(dbDocuments.length > 0) {
	}
	if(dbTree.length > 0) {
	}
	if(dbSLPs.length > 0) {
	} */
	if(dbSegmentation.length > 0) {
		promises.push(db.collection("segmentation").dropAsync());	
	}

	return Promise.all(promises);
}).then(function() {
	console.log("done dropping collections");


	var promises = [];
	//promises.push(db.collection("header").insertAsync(json.header));
	//promises.push(db.collection("documents").insertAsync(json.documents))
	//promises.push(db.collection("tree").insertAsync(json.tree));
	//promises.push(db.collection("slp").insertAsync(SLPs));
	promises.push(db.collection("segmentation").insertAsync(segmented));


	return Promise.all(promises);
}).then(function() {
	console.log("done storing tree to database");
	db.close();
})



/*
var util = require("util");
var MongoClient = require("mongodb").MongoClient,
	format = require("util").format;
var PATTree = require('pat-tree');

var argvs = process.argv;
var params = argvs.slice(2, argvs.length);

var index = parseInt(params[0]);
var counter = 0;
var content;
var result = "";
var tree = new PATTree();
MongoClient.connect("mongodb://localhost/pat-tree", function(err, db) {//"mongodb://murmuranalytics:murmuranalytics@ds045057.mongolab.com:45057/murmur-analytics", function(err, db) {
	if(err) {
		console.log(err);
	} else {
		console.log("connected to db");
		var postCollection = db.collection("post");
		var keywordCollection = db.collection("keyword");
		postCollection.find({}, {skip:index, limit:1}).toArray(function(err, posts) {
			if(err) {
				console.log(err);
			} else {
				var post = posts[0];
				content = post.content;
				keywordCollection.find().toArray(function(err, keywordsList) {
					if(err) {
						console.log(err) 
					} else {
						console.log("keywords count: " + keywordsList.length);
						var keywords = [];					
						for(var i = 0; i < keywordsList.length; i++) {
							keywords.push(keywordsList[i].name);
						}
						//console.log(keywords);

						result = tree.segmentDoc(content, keywords);				
						console.log(result);
						process.exit(1);
					}
				}) 				
			}

		})
	}
});
*/