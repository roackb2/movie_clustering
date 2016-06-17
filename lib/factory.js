var Promise = require("bluebird");
var PATTree = require("pat-tree");
var HAC = require("hac");
var jf = require("jsonfile");
var fs = require("fs");
var mongodb = Promise.promisifyAll(require("mongodb"));
var mysql = require("mysql");
var stringify = require("stringify")
var MongoClient = mongodb.MongoClient;
var format = require("util").format;
var stopWords = require("./stopWords.js").list;
var nodejieba = require("nodejieba");
var _ = require("lodash");
var FeatureSelector = require("feature-selector")

var connection = mysql.createConnection({
    host: 'ntu-big-data.cwvagat33sh4.us-east-1.rds.amazonaws.com',
    // host: 'localhost',
    user: 'big_data',
    password: 'big_data',
    database: 'big_data',
    port: '3306',
});

nodejieba.load({
  dict: "./dict/dict.utf8",
  hmmDict: "./dict/hmm_model.utf8",
  userDict: "./dict/userdict.utf8",
  idfDict: "./dict/idf.utf8",
  stopWordDict: "./dict/stop_words.utf8",
});

connection = Promise.promisifyAll(connection)

factory = {
    PatTree: "pat-tree",
    Jieba: "jieba",

    clusterPublicSentiment: function(segMethod, limitCount, featureCount, maxClusterCount) {
        stat = 'SELECT * FROM ptt_main'
        if (limitCount > 0 && limitCount < Number.MAX_VALUE) {
            stat += ' LIMIT ' + limitCount
        }
        console.log("stat: " + stat)
        return connection.queryAsync(stat).spread(function(rows, fields) {
            console.log("query done with " + rows.length + " records found")
            var segmented = []
            switch (segMethod) {
                case factory.Jieba:
                    _.forEach(rows, function(post, index) {
                        terms = nodejieba.cut(post.content, true)
                        terms = terms.filter(function(term) {
                            return term.match("^[\u4e00-\u9fa5]+$") && !stopWords.some(function(target) {
                                return term == target
                            })
                        })
                        segmented.push({
                            content: terms,
                            postId: post.id,
                        });
                        if (index % 100 == 0) {
                            console.log("done segmenting No." + index + " post");
                            console.log(stringify(terms, true))
                        }
                    })
                    break;
                case factory.PatTree:
                    var tree = new PATTree();
                    _.forEach(rows, function(post, index) {
                        tree.addDocument(post.content)
                        if (index % 100 == 0) {
                            console.log("done adding No." + index + " item to PAT tree");
                        }
                    })
                    tree.extractSLP(10, 0.5, true);
                    _.forEach(rows, function(post, index) {
                        var doc = tree.segmentDoc(post.content, true);
                        doc = doc.filter(function(term) {
                            return term.match("^[\u4e00-\u9fa5]+$") && !stopWords.some(function(target) {
                                return term == target
                            })
                        })
                        segmented.push({
                            content: doc,
                            postId: post.id,
                        });
                        if (index % 100 == 0) {
                            console.log("done segmenting No." + index + " post");
                            console.log(stringify(doc, true))
                        }
                    })
                default:
                    console.log("no method provided")
            }

            rows = null
            delete(rows)
            var hac = new HAC();
            _.forEach(segmented, function(post, index) {
                var terms = post.content;
                if (terms.length > 0) {
                    hac.addDocument(terms, post.postId);
                }
                if (index % 100 == 0) {
                    console.log("done adding No." + index + " segmented document to HAC");
                }
            })
            segmented = null
            delete(segmented)
            hac.cluster(HAC.GA, true);
            for(var i = 2; i < maxClusterCount; i++) {
                console.log("getting result for " + i + " clusters")
                clusters = hac.getClustersWithLabels(i, ["id", "content"], featureCount, FeatureSelector.MI);
                var result = "";
                _.forEach(clusters, function(cluster, index) {
                    result += "\n\n\t\tCluster No." + cluster.id + "\n\n\n";
                    _.forEach(cluster.labels, function(label) {
                        for (var key in label) {
                            result += key + ": " + label[key] + "\n";
                        }
                    })
                    result += "\n\n";
                    var docs = cluster.docs;
                    _.forEach(cluster.docs, function(doc) {
                        doc.postId = doc.id;
                        doc.clusterId = cluster.id;
                        result += doc.id + "\n";
                        result += doc.content + "\n\n";
                        delete(doc.id);
                    })
                    delete(cluster.docs);
                })
                fs.writeFileSync("output/cluster_" + i + ".txt", result);
            }
            return;
        })
    },

    readPostsFromFile: function(rootDir) {
        var file = rootDir + "/data/Post.json";
        var posts = jf.readFileSync(file).results;
        console.log("finished read file");
        return posts;
    },

    savePostsLocal: function(posts) {
        var db;
        var postCollection;
        return MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            db = db1;
            postCollection = db.collection("post");
            return postCollection.countAsync();
        }).then(function(count) {
            if (count > 0) {
                return postCollection.dropAsync();
            } else {
                return Promise.resolve("no need to drop");
            }
        }).then(function() {
            return postCollection.insertAsync(posts);
        }).then(function() {
            console.log("done save all posts to local DB.");
            db.close();
        });
    },

    buildTree: function(posts) {
        var tree = new PATTree();
        for (var i = 0; i < posts.length; i++) {
            tree.addDocument(posts[i].content);
            if (i % 100 == 0) {
                console.log("done adding No." + i + " item to PAT tree");
            }
        }
        console.log("done adding all " + posts.length + " posts");
        return tree;
    },

    saveTreeLocal: function(tree) {
        var db;
        return MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            db = db1;
            var promises = [];
            promises.push(db.collection("header").countAsync());
            promises.push(db.collection("documents").countAsync());
            promises.push(db.collection("tree").countAsync());
            return Promise.all(promises);
        }).spread(function(headerCount, docCount, treeCount) {
            var promises = [];
            if (headerCount > 0) {
                promises.push(db.collection("header").dropAsync());
            }
            if (docCount > 0) {
                promises.push(db.collection("documents").dropAsync());
            }
            if (treeCount > 0) {
                promises.push(db.collection("tree").dropAsync());
            }
            return Promise.all(promises);
        }).then(function() {
            var json = tree.toJSON();
            var promises = [];
            promises.push(db.collection("header").insertAsync(json.header));
            promises.push(db.collection("documents").insertAsync(json.documents));
            promises.push(db.collection("tree").insertAsync(json.tree));
            return Promise.all(promises);
        }).then(function() {
            console.log("done saving PAT tree to local DB.");
            db.close();
        })

    },

    generateSLP: function(tree) {
        SLPs = tree.extractSLP(10, 0.5, true);
        console.log("done extracting SLPs, number: " + SLPs.length);
        return SLPs;
    },

    saveSLPLocal: function(SLPs) {
        var db;
        return MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            db = db1;
            return db.collection("slp").countAsync();
        }).then(function(count) {
            if (count > 0) {
                return db.collection("slp").dropAsync();
            } else {
                return Promise.resolve("no need to drop");
            }
        }).then(function() {
            return db.collection("slp").insertAsync(SLPs);
        }).then(function() {
            console.log("done saving SLPs to local DB.");
            db.close();
        })
    },

    getSegmentedDocs: function(tree, posts, asArray) {
        var segmented = [];
        for (var i = 0; i < posts.length; i++) {
            var doc = tree.segmentDoc(posts[i].content, asArray);
            segmented.push({
                content: doc,
                postId: posts[i].objectId
            });
            if (i % 100 == 0) {
                console.log("done segmenting No." + i + " post");
            }
        }
        return segmented;
    },

    saveSegmentedLocal: function(segmented) {
        var db;
        return MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            db = db1;
            return db.collection("segmented").countAsync();
        }).then(function(count) {
            if (count > 0) {
                return db.collection("segmented").dropAsync();
            } else {
                return Promise.resolve("no need to drop");
            }
        }).then(function() {
            return db.collection("segmented").insertAsync(segmented);
        }).then(function() {
            console.log("done saving segmented documents to local DB.");
            db.close();
        })
    },

    getClustersAndSaveLocal: function(docCount, clusterCount, featureCount, filter) {
        var db;
        var allDocs = [];
        var clusters;
        return MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            db = db1;
            return db.collection("segmented").find().toArrayAsync();
        }).then(function(segmented) {
            segmented = segmented.filter(function(element) {
                return element.content.length != 0;
            })
            var hac = new HAC();
            for (var i = 0; i < docCount; i++) {
                var terms = segmented[i].content;
                if (filter) {
                    terms = terms.filter(function(term) {
                        return !stopWords.some(function(stopWord) {
                            return stopWord == term;
                        })
                    })
                }
                if (terms.length > 0) {
                    hac.addDocument(terms, segmented[i].postId);
                }
                if (i % 100 == 0) {
                    console.log("done adding No." + i + " segmented document to HAC");
                }
            }
            hac.cluster(HAC.GA, true);
            clusters = hac.getClustersWithLabels(clusterCount, ["id", "content"], featureCount);
            var result = "";
            for (var i = 0; i < clusters.length; i++) {
                var cluster = clusters[i];
                result += "\n\n\t\tCluster No." + cluster.id + "\n\n\n";
                for (var j = 0; j < cluster.labels.length; j++) {
                    var label = cluster.labels[j];
                    for (var key in label) {
                        result += key + ": " + label[key] + "\n";
                    }
                }
                result += "\n\n";
                var docs = cluster.docs;
                for (var j = 0; j < docs.length; j++) {
                    var doc = docs[j];
                    doc.postId = doc.id;
                    doc.clusterId = cluster.id;
                    result += doc.content + "\n\n";
                    allDocs.push(doc);
                    delete(doc.id);
                }
                delete(cluster.docs);
            }
            fs.writeFileSync("./test.txt", result);
            var promises = [
                db.collection("cluster").countAsync(),
                db.collection("assigned").countAsync()
            ];
            return Promise.all(promises);
        }).spread(function(clusterCount, assignedCount) {
            var promises = [];
            if (clusterCount > 0) {
                promises.push(db.collection("cluster").dropAsync());
            }
            if (assignedCount > 0) {
                promises.push(db.collection("assigned").dropAsync());
            }
            return Promise.all(promises);
        }).then(function() {
            var promises = [
                db.collection("cluster").insertAsync(clusters),
                db.collection("assigned").insertAsync(allDocs)
            ];
            return Promise.all(promises);
        }).then(function() {
            console.log("done inserting clustering result to local DB")
            db.close();
        });

    },

    saveLocalToRemote: function() {
        var db;
        var post;
        var segmented;
        var assigned;
        var cluster;
        var slp;
        return MongoClient.connectAsync("mongodb://localhost/pat-tree").then(function(db1) {
            console.log("connected to local DB")
            db = db1;
            var promises = [
                db.collection("post").find().toArrayAsync(),
                db.collection("segmented").find().toArrayAsync(),
                db.collection("assigned").find().toArrayAsync(),
                db.collection("cluster").find().toArrayAsync(),
                db.collection("slp").find().toArrayAsync()
            ];

            return Promise.all(promises);
        }).spread(function(dbPost, dbSegmented, dbAssigned, dbCluster, dbSlp) {
            console.log("got all collections from local DB")
            post = dbPost;
            segmented = dbSegmented;
            assigned = dbAssigned;
            cluster = dbCluster;
            slp = dbSlp;

            db.close();

            return MongoClient.connectAsync("mongodb://murmuranalytics:murmuranalytics@ds045057.mongolab.com:45057/murmur-analytics")

        }).then(function(db1) {
            console.log("connected to remote DB")
            db = db1;

            var promises = [
                db.collection("post").find().countAsync(),
                db.collection("segmented").find().countAsync(),
                db.collection("assigned").find().countAsync(),
                db.collection("cluster").find().countAsync(),
                db.collection("slp").find().countAsync()
            ];

            return Promise.all(promises);
        }).spread(function(postCount, segmentedCount, assignedCount, clusterCount, slpCount) {
            console.log("got all counts for all collections of remote DB");
            var promises = [];
            if (postCount > 0) {
                promises.push(db.collection("post").dropAsync());
            }
            if (segmentedCount > 0) {
                promises.push(db.collection("segmented").dropAsync());
            }
            if (assignedCount > 0) {
                promises.push(db.collection("assigned").dropAsync());
            }
            if (clusterCount > 0) {
                promises.push(db.collection("cluster").dropAsync());
            }
            if (slpCount > 0) {
                promises.push(db.collection("slp").dropAsync());
            }

            return Promise.all(promises);
        }).then(function() {
            console.log("done dropping collections of remote DB");
            var promises = [
                db.collection("post").insertAsync(post),
                db.collection("segmented").insertAsync(segmented),
                db.collection("assigned").insertAsync(assigned),
                db.collection("cluster").insertAsync(cluster),
                db.collection("slp").insertAsync(slp)
            ];

            return Promise.all(promises);
        }).then(function() {
            console.log("done inserting all new records");
            db.close();
        })
    }

}

module.exports = factory
