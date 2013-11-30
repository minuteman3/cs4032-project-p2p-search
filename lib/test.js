var PeerNet = require('./peernet.js')

var test = new PeerNet(4, "127.0.0.1", 8767)

setInterval(function () { console.log(test); }, 10000);
