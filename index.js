#!/usr/bin/env node

var os = require('os'),
    argv = require('optimist').argv,
    PeerNet = require('./lib/peernet.js'),
    interfaces = os.networkInterfaces(),
    myIP,
    searchServer;

for (var dev in interfaces) {
    interfaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.internal === false) myIP = details.address;
    });
}

init();

function init() {
    if (typeof argv.id === 'number') {
        searchServer = new PeerNet(argv.id, myIP);
    } else {
        console.log("YOU MUST ENTER AN ID");
        process.exit();
    }
    if (argv.bootstrap) searchServer.joinNetwork(argv.bootstrap);
}
