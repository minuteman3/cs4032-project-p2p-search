var PeerNet = require('./peernet.js')

var test = new PeerNet(42, "192.168.0.13", 8767)
test.joinNetwork("192.168.0.11");

setTimeout(function() { 
    test.indexPage("www.google.com", ["foo", "barz"]) 
    setTimeout(function() { 
        test.search("foo", function(results) {
            console.log(results);
        });
        test.indexPage("www.google.com", ["baz", "qux"])
        test.indexPage("www.reddit.com", ["foo", "qux"])
    }, 1000);
}, 1000);


setInterval(function () { console.log(test); }, 10000);
