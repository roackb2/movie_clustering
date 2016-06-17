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

var amount = parseInt(params[0]);
//console.log(amount);

var db;
var skip;
var tree;
var posts;
var SLPs;
var json;

var start;
var end;

MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
	db = db1;
	return db.collection("documents").countAsync();
}).then(function(count) {
	skip = count;
	//console.log(skip);
	
	start = new Date();
	var promises = [
	db.collection("post").find().sort({createdAt: -1}).toArrayAsync(),
	db.collection("header").find().toArrayAsync(),
	db.collection("documents").find().toArrayAsync(),
	db.collection("tree").find().toArrayAsync(),
	db.collection("slp").find().toArrayAsync()
	]

	return Promise.all(promises);
}).spread(function(dbPosts, dbHeaders, dbDocuments, dbTree, dbSLPs) {
	console.log("done loading collections");
	posts = dbPosts;
	tree = new PATTree();	

	
	if(dbHeaders.length != 0) {
		var result = {};
		result.header = dbHeaders[0];
		result.documents = dbDocuments;
		result.tree = dbTree;
		tree.reborn(result);
		console.log("done reborn");
	}
	
	/*
	for(var i = 0; i < posts.length; i++) {	
		tree.addDocument(posts[i].content);
		if(i % 100 == 0) {
			console.log("done adding No." + i + " item to PAT tree");			
		}
	}
	console.log("done adding all " + posts.length + " posts");
	end = new Date();
	var time = utils.getElpasedTime(start, end);

	console.log(time);
	process.exit(1);
	*/

	SLPs = tree.extractSLP(10, 0.5, true);
	console.log("done extracting SLPs, number: " + SLPs.length);
	//json = tree.toJSON();
	//console.log("done converting to json");	

	/*
	for(var i = 0; i < SLPs.length; i++) {
		SLPs[i] = {name: SLPs[i]};
	}
	*/

	
	var promises = [];
	//promises.push(db.collection("header").dropAsync());
	//promises.push(db.collection("documents").dropAsync());
	//promises.push(db.collection("tree").dropAsync());	
	promises.push(db.collection("slp").dropAsync());	

	/*
	if(dbHeaders.length > 0) {
	}
	if(dbDocuments.length > 0) {
	}
	if(dbTree.length > 0) {
	}
	if(dbSLPs.length > 0) {
	} */


	return Promise.all(promises);
}).then(function() {
	console.log("done dropping collections");


	var promises = [];
	//promises.push(db.collection("header").insertAsync(json.header));
	//promises.push(db.collection("documents").insertAsync(json.documents))
	//promises.push(db.collection("tree").insertAsync(json.tree));
	promises.push(db.collection("slp").insertAsync(SLPs));


	return Promise.all(promises);
}).then(function() {
	console.log("done storing tree to database");
	db.close();
})

