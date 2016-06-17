var Promise = require("bluebird");
var HAC = require("hac");
var jf = require("jsonfile");
var fs = Promise.promisifyAll(require("fs"));
var stringify = require("stringify")
var format = require("util").format;
var stopWords = require("./stopWords.js").list;
var _ = require("lodash");
var FeatureSelector = require("feature-selector")

var ignoreList = ['.DS_Store']

factory = {
    clusterMovies: function(featureCount, featureMethod, maxClusterCount, labelCount) {
        return fs.readdirAsync("./input").then(fileNames => {
            console.log("done reading folder, " + fileNames.length + " files in total")
            var promises = []
            _.forEach(fileNames, (fileName, index) => {
                if (ignoreList.indexOf(fileName) == -1) {
                    promises.push(fs.readFileAsync("./input/" + fileName, 'utf8').then(content => {
                        return {name: fileName.replace(".txt", ""), terms: content.split("\n").filter(term => {
                            return !term.match(/^\s+$/g)
                        })}
                    }))
                }
            })
            return Promise.all(promises)
        }).then(movies => {
            console.log("done reading files")
            selector = new FeatureSelector()
            hac = new HAC()
            _.forEach(movies, (movie, index) => {
                selector.addDocument(movie.terms, movie.name)
                console.log("adding No." + index + " document to selector")
            })
            console.log("done adding documents to feature selector")
            featuerClusters = selector.getFeature(featureCount, featureMethod, true);
            console.log("done getting feature")
            _.forEach(featuerClusters, featureCluster => {
                var features = featureCluster.features.map(feature => {
                    return feature.term
                })
    			var label = featureCluster.label;
    			var movie = movies.find(candidate => {
    				return candidate.name == label;
    			})
                movie.terms = movie.terms.filter(term => {
                    return features.indexOf(term) != -1 && stopWords.indexOf(term) == -1
                })
                hac.addDocument(movie.terms, movie.name)
    		})
            hac.cluster(HAC.GA, true);
            for(var i = 2; i < maxClusterCount; i++) {
                console.log("getting result for " + i + " clusters")
                clusters = hac.getClustersWithLabels(i, ["id", "content"], labelCount, FeatureSelector.MI);
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
}

module.exports = factory
