var PeerNet = require('./peernet.js')

var bootstrap = new PeerNet(100000, "127.0.0.1", 12345);
var node1 = new PeerNet(42, "127.0.0.1", 8767)
var node2 = new PeerNet(200000, "127.0.0.1", 23456);
node1.joinNetwork("127.0.0.1", 12345);
node2.joinNetwork("127.0.0.1", 12345);

setTimeout(function() {
    node1.indexPage("www.google.com", ["foo", "barz"])
    setTimeout(function() {
        search1()
        node1.indexPage("www.google.com", ["baz", "qux"])
        node1.indexPage("www.reddit.com", ["foo", "qux"])
        setTimeout(search2, 4000);
    }, 1000);
}, 1000);

function search1() {
    node1.search(["foo", "barz"], console.log);
}

function search2() {
    node1.search(["foo", "qux", "baz"], console.log);
}

setInterval(function () { console.log(node1); }, 10000);
