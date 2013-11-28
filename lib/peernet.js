'use strict';

var dgram = require('dgram');
var async = require('async');
var messages = require('./messages.js');
var constants = require('./constants.js');
var hashit = require('./hashit.js');
//var _ = require('lodash');

var PORT = 8767;

module.exports = PeerNet;

function PeerNet(id, ip_address) {
    this.id = id;
    this.ip_address = ip_address;
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(PORT);
    this.routing_table = {};
    this.storage = {};
    this.pending_results = {};
    this.awaiting_acks = {};

    var route = function route(value, cb) {
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
    }.bind(this);

    this.joinNetwork = function joinNetwork(bootstrap_node) {
        var msg = messages.join(this.id, bootstrap_node);
        this.socket.send(msg, 0, msg.length, PORT, bootstrap_node);
    }.bind(this);

    this.leaveNetwork = function leaveNetwork() {
        var msg = messages.leave(this.id);
        async.each(Object.keys(this.routing_table), function(id) {
            this.socket.send(msg, 0, msg.length, PORT, this.routing_table[id].address);
        }.bind(this), function(err) {
            if (err) throw err;
        });
    }.bind(this)

    var index = function index(word, url) {
        var hash = hashit(word);
        route(hash, function(id) {
            if (!(word in this.storage)) this.storage[word] = [];
            this.storage[word].push(url);
            if (id !== this.id) {
                var msg = messages.index(hash, word, url);
                send(msg, id);
            }
        });
    }.bind(this);

    var ack = function ack(ip) {
        var msg = messages.ack(this.id, this.ip_address);
        this.socket.send(msg, 0, msg.length, PORT, ip);
    }.bind(this);

    var ping = function ping(suspect_id) {
        route(suspect_id, function(id) {
            var msg = messages.ping(this.id, suspect_id, this.ip_address);
            send(msg, id);
            this.awaiting_acks[suspect_id] = setTimeout(function() {
                delete this.awaiting_acks[suspect_id];
                delete this.routing_table[suspect_id];
            }, 10000);
        });
    }.bind(this);

    var send = function send(msg, id) {
        this.socket.send(msg, 0, msg.length, PORT, this.routing_table[id].address);
        clearTimeout(this.awaiting_acks[id]);
        this.awaiting_acks[id] = setTimeout(function() {
            ping(id);
        }, 30000);
    }.bind(this);

    var handle_incoming = function handle_incoming(buf) {
        var msg = JSON.parse(buf.toString());
        switch (msg.type) {
            case constants.JOIN_T:
                handleJoiningMsg(msg);
                break;
            case constants.ROUTING_T:
                handleRoutingMsg(msg);
                break;
            case constants.LEAVING_T:
                handleLeavingMsg(msg);
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
                clearTimeout(this.awaiting_acks[msg.id]);
                break;
        }
    }.bind(this);

    var handleJoiningMsg = function handleJoiningMsg(msg) {
        ack(msg.ip_address);
    }.bind(this);

    var handleRoutingMsg = function handleRoutingMsg(msg) {
        ack(msg.ip_address);
        console.log(msg);
        async.each(msg.route_table, function(route) {
            this.routing_table[route.node_id] = route.ip_address;
        }.bind(this), function (err) {
            if (err) throw err;
        });
        route(msg.bootstrap_id, function(id) {
            send(msg, id);
        });
    }.bind(this);

    var handleLeavingMsg = function handleLeavingMsg(msg) {
        clearTimeout(this.awaiting_acks[msg.node_id]);
        delete this.awaiting_acks[msg.node_id];
        delete this.routing_table[msg.node_id];
    }.bind(this);

    var handleIndexMsg = function handleIndexMsg(msg) {
        ack(msg.ip_address);
    }.bind(this);

    this.socket.on('message', handle_incoming);
}
