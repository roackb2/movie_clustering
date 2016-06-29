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
    clusterMovies: function(clusterMethod, useFeatureSelection, featureCount, featureMethod, maxClusterCount, labelCount, movieCount) {
        return fs.readdirAsync("./input/").then(fileNames => {
            console.log("done reading folder, " + fileNames.length + " files in total")
            var promises = []
            _.forEach(fileNames, (movideDir, index) => {
                if(movieCount == undefined) {
                    movieCount = Number.POSITIVE_INFINITY
                }
                if (ignoreList.indexOf(movideDir) == -1 && index <= movieCount) {
                    promises.push(fs.readdirAsync("./input/" + movideDir).then(fileNames => {
                        promises = []
                        _.forEach(fileNames, fileName => {
                            if (ignoreList.indexOf(fileName) == -1) {
                                promises.push(fs.readFileAsync("./input/" + movideDir + "/" + fileName, 'utf8'))
                            }
                        })
                        return Promise.all(promises).then(function(contents) {
                            map = {name: movideDir, docs:[]}
                            _.forEach(contents, content => {
                                map.docs.push(content.split(/\s+/).filter(term => {
                                    return !term.match(/^\s*%/) && term != ""
                                }))
                            })
                            // console.log(stringify(map))
                            return map
                        })
                    }))
                }
            })
            return Promise.all(promises)
        }).then(movies => {
            hac = new HAC()
            if (featureMethod == undefined || featureMethod == '') {
                useFeatureSelection = false
            }
            if (useFeatureSelection) {
                selector = new FeatureSelector()
                _.forEach(movies, (movie, index) => {
                    _.forEach(movie.docs, doc => {
                        selector.addDocument(doc, movie.name)
                    })
                    console.log("adding No." + index + " document to selector")
                })
                console.log("done adding documents to feature selector")
                featuerClusters = selector.getFeature(featureCount, FeatureSelector[featureMethod], true);
                console.log("done getting feature")
                _.forEach(featuerClusters, (featureCluster, index) => {
                    // console.log("featureCluster: " + stringify(featureCluster, true))
                    var features = featureCluster.features.map(feature => {
                        return feature.term
                    })
        			var label = featureCluster.label;
        			var movie = movies.find(candidate => {
        				return candidate.name == label;
        			})
                    movie.terms = _.flatten(movie.docs).filter(term => {
                        return features.indexOf(term) != -1 && stopWords.indexOf(term) == -1
                    })
                    // console.log(stringify(movie))
                    hac.addDocument(movie.terms, movie.name)
                    console.log("adding No." + index + " document to HAC")
        		})
            } else {
                _.forEach(movies, (movie, index) => {
                    movie.terms = _.flatten(movie.docs).filter(term => {
                        return stopWords.indexOf(term) == -1
                    })
                    hac.addDocument(movie.terms, movie.name)
                    console.log("adding No." + index + " document to HAC")
                })
            }
            hac.cluster(HAC[clusterMethod], true);
            for(var i = 2; i <= maxClusterCount; i++) {
                console.log("getting result for " + i + " clusters")
                clusters = hac.getClustersWithLabels(i, ["id", "content"], labelCount, FeatureSelector[featureMethod]);
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
                dest_folder = "output/" + clusterMethod + "_" + featureMethod
                try {
                    fs.mkdirSync(dest_folder)
                } catch(err) {
                    ;
                }
                fs.writeFileSync(dest_folder + "/cluster_" + i + ".txt", result);
            }
            return;
        })
    },
}

module.exports = factory
