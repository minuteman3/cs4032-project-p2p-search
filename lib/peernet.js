'use strict';

var dgram = require('dgram');
var async = require('async');
var messages = require('./messages.js');
var constants = require('./constants.js');
var hashit = require('./hashit.js');
//var _ = require('lodash');

var PORT = 8767;

function PeerNet(id, ip_address) {
    this.id = id;
    this.ip_address = ip_address;
    this.socket = init(port);
    this.routing_table = {};
    this.storage = {};
    this.pending_results = {};

    function route(value, cb) {
        var closest = this.id;
        async.each(Object.keys(this.routing_table), function(id) {
            if (Math.abs(id - value) < Math.abs(closest - value)) {
                closest = id;
            }
        }, function (err) {
            if (!err) {
                cb(closest);
            }
        });
    }

    this.joinNetwork = function joinNetwork(bootstrap_node) {
        var msg = messages.join(this.id, bootstrap_node);
        this.socket.send(msg, 0, msg.length, PORT, bootstrap_node);
    }

    this.leaveNetwork = function leaveNetwork() {
        var msg = messages.leave(this.id);
        async.each(Object.keys(this.routing_table), function(id) {
            this.socket.send(msg, 0, msg.length, PORT, this.routing_table[id].address);
        }, function(err) {
            if (err) throw err;
            else return true;
        });
    }

    function index(word, url) {
        var hash = hashit(word);
        route(hash, function(id) {
            if (!(word in this.storage)) this.storage[word] = [];
            this.storage[word].push(url);
            if (id !== this.id) {
                var msg = messages.index(hash, word, url);
                this.socket.send(msg, 0, msg.length, PORT, this.routing_table[id].address);
            }
        }
    }

    function handle_incoming(buf) {
        var msg = JSON.parse(buf.toString());
        switch (msg.type) {
            case constants.JOIN_T:
                break;
            case constants.ROUTING_T:
                break;
            case constants.LEAVING_T:
                break;
            case constants.INDEX_T:
                break;
            case constants.SEARCH_T:
                break;
            case constants.SEARCHR_T:
                break;
            case constants.PING_T:
                break;
            case constants.ACK_T:
                break;
        }
    }
    this.socket.on('message', handle_incoming);
}

function init(port) {
    var socket = dgram.createSocket('udp4');
    socket.bind(PORT);
    return socket;
}

