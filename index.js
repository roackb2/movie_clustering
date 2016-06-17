var factory = require("./lib/factory.js");
var FeatureSelector =  require('feature-selector')


//var posts = factory.readPostsFromFile(".");
var tree;
var SLPs;
var segmented;
//console.log("posts count: " + posts.length);
/*factory.savePostsLocal(posts).then(function() {
	tree = factory.buildTree(posts);
	return factory.saveTreeLocal(tree);
}).then(function() {
	SLPs = factory.generateSLP(tree);
	return factory.saveSLPLocal(SLPs);
}).then(function() {
	segmented = factory.getSegmentedDocs(tree, posts, false);
	return factory.saveSegmentedLocal(segmented);
}).then(function() {
	console.log("done");
})*/

/*tree = factory.buildTree(posts);
factory.generateSLP(tree);
segmented = factory.getSegmentedDocs(tree, posts, true);
factory.saveSegmentedLocal(segmented).then(function() {
	console.log("done");
})*/

factory.clusterMovies(100, FeatureSelector.MI, 20, 20).then(function() {
    console.log("done")
    process.exit(0)
}).catch(function(err) {
    console.log(err)
    process.exit(0)
})


// factory.getClustersAndSaveLocal(7000, 12, 100, true).then(function() {
//     console.log("done");
// })


/*
factory.saveLocalToRemote().then(function() {
	console.log("done");
})*/


/*//console.log(SLPs);
factory.saveTreeLocal(tree).then(function() {
	console.log("done");
})
//tree.printTreeContent();
factory.saveSLPLocal(SLPs).then(function() {
	console.log("done");
})

var segmented = factory.getSegmentedDocs(tree, posts, SLPs);
//console.log(segmented);

factory.saveSegmentedLocal(segmented).then(function() {
	console.log("done");
})*/
