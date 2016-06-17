"use strict;"

var util = require("util");
var utils = require("./utils.js")
var MongoClient = require("mongodb").MongoClient,
	format = require("util").format;
var PATTree = require('pat-tree');

var tree = new PATTree();
var argvs = process.argv;
var params = argvs.slice(2, argvs.length);

var limit = parseInt(params[0]);
console.log(limit);
var counter = 0;
MongoClient.connect("mongodb://localhost/murmur-analytics", function(err, db) {//"mongodb://murmuranalytics:murmuranalytics@ds045057.mongolab.com:45057/murmur-analytics", function(err, db) {
	if(err) {
		console.log(err);
	} else {
		console.log("connected to db");
		var postCollection = db.collection("post");
		var keywordCollection = db.collection("keyword");
		postCollection.find({}, {limit: limit}).toArray(function(err, posts) {
			console.log("posts count: " + posts.length);
			var start = new Date();
			console.log("start at: " + start);
			for(var i = 0; i < posts.length; i++) {
				var post = posts[i];
				tree.addDocument(post.content);
				console.log("end adding No." + i + " item");
			}
			var end = new Date();
			console.log("end at: " + end);
			console.log("time elapsed: " + getElpasedTime(start, end));

			/*
			var SLPs = tree.extractSLP(5, 0.3);
			console.log("SLP count: " + SLPs.length);	
			
			keywordCollection.drop(function(err, reply) {
				if(err && err.errmsg != "ns not found") {
					console.log("error on deletion: " + err);
				} else {
					for(var i = 0; i < SLPs.length; i++) {
						keywordCollection.insert({name: SLPs[i]}, function(err, result) {
							if(err) {
								console.log(err);
							} else {
								counter++;
								if(counter == SLPs.length) {
									console.log("done");
									process.exit(1);
								}
							}
						});
					}				
				}
			});
			*/
		});					
	}
});


