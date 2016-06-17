"use strict;"

var jf = require("jsonfile");
var util = require("util");
var MongoClient = require("mongodb").MongoClient,
	format = require("util").format;

var postFile = "/Users/roackb2/Studio/programming/node.js/murmur-analytics/data/Post.json";

var posts = jf.readFileSync(postFile).results;
console.log("finished read file");

var counter = 0;
MongoClient.connect("mongodb://murmuranalytics:murmuranalytics@ds045057.mongolab.com:45057/murmur-analytics", function(err, db) {
	if(err) {
		console.log(err);
	} else {
		console.log("posts count: " + posts.length);
		console.log("connected to db");
		if(db.post) {
			db.post.drop();
		}
		var postCollection = db.collection("post");
		for(var i = 0; i < posts.length; i++) {
			//console.log("inserting " + i + "th item");
			postCollection.insert(posts[i], function(err, docs) {
				if(err) {
					console.log(err);
				} else {
					counter++;
					console.log("finihsed inserting No." + counter + " item");
					if(counter == posts.length) {
						console.log("done");
						process.exit(1);
					}
				}
			});
		}
	}
});
