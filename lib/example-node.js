var PeerNet = require('./peernet.js')

var port = 9000;
var node1 = new PeerNet(12345, "127.0.0.1", port++);

var indexed_words = [];
setTimeout(function() {
setTimeout(function() {
    node1.joinNetwork("127.0.0.1", 12345);
    setTimeout(function() {
        for (var i = 0; i < 10; i++) {
            var page = ((~~(Math.random() * 1E6)).toString(36));
            var word = ((~~(Math.random() * 1E6)).toString(36));
            indexed_words.push(word);
            node1.indexPage(page, [word]);
        }
        setTimeout(function() {
            search1()
        }, 3000)
    }, 3000);;
}, 1000);}, 4000);

function search1() {
    node1.search(indexed_words, console.log);
}

setInterval(function () { console.log(node1); }, 10000);
