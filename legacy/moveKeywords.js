"use strict;"
var Promise = require("bluebird");
var util = require("util");
var mongodb = Promise.promisifyAll(require("mongodb"));
var MongoClient = mongodb.MongoClient,
	format = require("util").format;

var counter = 0;
var db;
var SLP;
var segmentation

MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
	console.log("connected to db")
	db = db1;
	var promises = [
	db.collection("slp").find().toArrayAsync(),
	db.collection("segmentation").find().toArrayAsync()];

	return Promise.all(promises);
}).spread(function(dbSLP, dbSegmentation) {
	console.log("all collection loaded")
	SLP = dbSLP;
	segmentation = dbSegmentation;
	db.close();

	return MongoClient.connectAsync("mongodb://murmuranalytics:murmuranalytics@ds045057.mongolab.com:45057/murmur-analytics");
}).then(function(db2) {
	console.log("connected to remote db")
	db = db2;

	var promises = [
	db.collection("slp").insertAsync(SLP),
	db.collection("segmentation").insertAsync(segmentation)];

	return Promise.all(promises);
}).then(function() {
	console.log("done inserting all documents")
	db.close();
	process.exit(1);
})




