var PeerNet = require('./peernet.js')


var port = 20000;
for (var i = 0; i < 6; i++) {
    var n = new PeerNet(~~(Math.random() * 1E5 * 2), "127.0.0.1", port++);
    n.joinNetwork("127.0.0.1", 12345);
}
