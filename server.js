var net = require('net');
var through = require('through');
var Stream = require('stream-map');

net.createServer(function(stream) {
    stream.pipe(through(function (buff) {
        buff = buff.toString().toLowerCase().split(/\s+/);
        buff.forEach(function (word) {
            if (word !== '\x00' && word.length > 0) this.queue(word.replace(/[^\w-]/g, ''));
            else if (word === '\x00') {
                this.end();
            }
        }, this);
    })).reduce(function(acc, word) {
        acc[word] = acc[word]?acc[word] + 1:1;
        return acc;
    }, {}).pipe(through(function (buff) {
        this.queue(JSON.stringify(buff));
    })).pipe(stream);
}).listen(8080);
