var fs = require('fs');
var net = require('net');
var through = require('through');
var concat = require('concat-stream');

var file = process.argv[2];
var filters = process.argv;

filters.splice(0,3);

console.log("connecting to server");
var client = net.connect({port: 8080}, function () {
    console.log("sending file");
    fs.createReadStream(file).on('data', function(data) {
        client.write(data);
    }).on('end', function() {
        client.write('\x00');
    });
});

client.pipe(concat(function (data) {
    console.log("receiving results");
    data = JSON.parse(data.toString());
    if (filters.length) {
        filters.forEach(function (key) {
            data[key] = data[key] || 0;
        });
        Object.keys(data).forEach(function(key) {
            if (filters.indexOf(key) === -1) delete data[key];
        });
    }
    console.log("results: ");
    Object.keys(data).forEach(function (key) {
        console.log("\t%s: %d", key, data[key]);
    });
}));
