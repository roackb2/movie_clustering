var factory = require("./lib/factory.js");
var FeatureSelector = require('feature-selector')
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    if (numCPUs < 4) {
        console.log("not enough CPU core count for parallelism")
        process.exit(0)
    }

    tasks = [{
        clusterMethod: 'GA',
        featureMethod: 'MI',
    }, {
        clusterMethod: 'GA',
        featureMethod: 'LLR',
    }, {
        clusterMethod: 'CompleteLink',
        featureMethod: 'MI',
    }, {
        clusterMethod: 'CompleteLink',
        featureMethod: 'LLR',
    }, ]

    var numDone = 0;

    function messageHandler(msg) {
        console.log(msg)
        numDone += 1;
        if(numDone == 4) {
            process.exit(0)
        }
    }

    for (var i = 0; i < 4; i++) {
        var worker = cluster.fork();
        worker.send(tasks[i]);
        worker.on('message', messageHandler)
    }
} else if (cluster.isWorker) {
    process.on('message', (msg) => {
        factory.clusterMovies(msg.clusterMethod, true, 100, msg.featureMethod, 20, 20).then(() => {
            process.send("done clustering with " + msg.clusterMethod + ", " + msg.featureMethod)
        }).catch((err) => {
            process.send(err)
        })
    });
}
