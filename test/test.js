var modules = {};
var Promise = require("bluebird");
var PATTree = require("pat-tree");
var HAC = require("hac");
var jf = require("jsonfile");
var fs = require("fs");
var mongodb = Promise.promisifyAll(require("mongodb"));
var MongoClient = mongodb.MongoClient;
var format = require("util").format;
var factory = require("../lib/factory.js");
var stopWords = require("../lib/stopWords.js").list;


modules.scripts = {

    testDB: function() {
        var db;
        MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            db = db1;
            return db.collection("documents").countAsync();
        }).then(function(count) {
            console.log(count);
            db.close();
        });
    },

    testHAC: function(postCount, clusterCount) {
        var db;
        var hac = new HAC()
        if (postCount == undefined) {
            postCount = 1000;
        }
        if (clusterCount == undefined) {
            clusterCount = 12;
        }
        return MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            db = db1;
            return db.collection("segmented").find().toArrayAsync();
        }).then(function(posts) {
            posts = posts.filter(function(element) {
                    return element.content.length > 0;
                })
                //var postCount = 2000;
                //var clusterCount = 12;
            for (var i = 0; i < postCount; i++) {
                var terms = posts[i].content;
                //console.log(terms);
                terms = terms.filter(function(term) {
                    return !stopWords.some(function(stopWord) {
                        return term == stopWord;
                    })
                })
                if (terms.length > 0) {
                    hac.addDocument(terms, posts[i].postId);
                }
                if (i % 100 == 0) {
                    console.log("done adding No." + i + " post");
                }
            }

            /*           console.log(hac.postings.length);
                       db.close();*/

            hac.cluster(HAC.GA, true);
            console.log("done clustering");
            var clusters = hac.getClusters(clusterCount, ["id", "content"]);
            var clusterTerms = hac.getClustersFrequentTerms(clusterCount, 10);
            console.log(clusterTerms.length);
            var text = "";
            for (var i = 0; i < clusters.length; i++) {
                //console.log("cluster " + i);
                text += "\n\n\t\tcluster No." + i + "\n\n\n\n";
                var terms = clusterTerms[i];
                for (var j = 0; j < terms.length; j++) {
                    for (var key in terms[j]) {
                        text += key + ": " + terms[j][key] + "\n";
                        //console.log(key + ": " + terms[j][key]);
                    }
                }
                var cluster = clusters[i];
                for (var j = 0; j < cluster.length; j++) {
                    var doc = cluster[j];
                    text += doc.content + "\n\n";
                }
                fs.writeFileSync("../test.txt", text);
            }

            db.close();
            return clusters;
        })
    },


}

function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;

    while (0 != currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

var argvs = process.argv;
var module = argvs[2];
var command = argvs[3];
var params = process.argv.slice(4, argvs.length)
modules[module][command].apply(modules[module], params);
