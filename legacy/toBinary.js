var PATTree = require("pat-tree");


var argvs = process.argv;
var params = argvs.slice(2, argvs.length);

var string = params[0];

var tree = new PATTree();

console.log(tree._toBinary(string));