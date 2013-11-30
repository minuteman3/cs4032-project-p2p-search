'use strict';

var dgram = require('dgram');
var async = require('async');
var messages = require('./messages.js');
var constants = require('./constants.js');
var hashit = require('./hashit.js');

var PORT = 8767;

module.exports = PeerNet;

function PeerNet(id, ip_address) {
    this.id = id;
    this.ip_address = ip_address;
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(PORT);
    this.routing_table = {};
    this.routing_table[this.id] = this.ip_address;
    this.storage = {};
    this.pending_results = {};
    this.awaiting_acks = {};

    var route = function route(value, cb) {
        var closest = this.id;
        for (var id in this.routing_table) {
            if (Math.abs(id - value) < Math.abs(closest - value)) {
                closest = id;
            }
        }
        cb(closest);
    }.bind(this);

    this.joinNetwork = function joinNetwork(bootstrap_node) {
        var msg = messages.join(this.id, this.ip_address);
        this.socket.send(msg, 0, msg.length, PORT, bootstrap_node);
    }.bind(this);

    this.leaveNetwork = function leaveNetwork() {
        var msg = messages.leave(this.id);
        async.each(Object.keys(this.routing_table), function(id) {
            this.socket.send(msg, 0, msg.length, PORT, this.routing_table[id]);
        }.bind(this), function(err) {
            if (err) throw err;
        });
    }.bind(this)

    this.search = function search(word, cb) {
        if (!(word in this.pending_results)) this.pending_results[word] = [];
        var msg = messages.search(word, hashit(word), this.id);
        route(hashit(word), function(id) {
            send(msg, id);
            setTimeout(function() {
                cb(this.pending_results[word]);
                this.pending_results[word] = [];
            }.bind(this), 3000);
        }.bind(this));
    }.bind(this);

    this.indexPage = function indexPage(url, words) {
        async.each(words, function(word) {
            index(word, url);
        }.bind(this), function(err) {
            if (err) throw err;
        })
    }

    var index = function index(word, url) {
        var hash = hashit(word);
        route(hash, function(id) {
            console.log(hash, id);
            if (id !== this.id) {
                var msg = messages.index(hash, this.id, word, url);
                send(msg, id);
            }
        }.bind(this));
    }.bind(this);

    var ack = function ack(ip) {
        console.log(ip);
        var msg = messages.ack(this.id, this.ip_address);
        this.socket.send(msg, 0, msg.length, PORT, ip);
    }.bind(this);

    var ping = function ping(suspect_id, source_id) {
        route(suspect_id, function(id) {
            if (id === this.id) return;
            var msg = messages.ping(source_id || this.id, suspect_id, this.ip_address);
            send(msg, id, true);
            this.awaiting_acks[id] = setTimeout(function() {
                delete this.awaiting_acks[id];
                delete this.routing_table[id];
            }, 10000);
        }.bind(this));
    }.bind(this);

    var send = function send(msg, id, no_ping) {
        console.log("SENDING TO ID: %s, (%s)", id, this.routing_table[id]);
        console.log(msg.toString());
        this.socket.send(msg, 0, msg.length, PORT, this.routing_table[id]);
        if (!no_ping) {
            clearTimeout(this.awaiting_acks[id]);
            this.awaiting_acks[id] = setTimeout(function() {
                ping(id);
            }, 30000);
        }
    }.bind(this);

    var handle_incoming = function handle_incoming(buf) {
        var msg = JSON.parse(buf.toString());
        console.log(msg);
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
                clearTimeout(this.awaiting_acks[msg.sender_id]);
                handleIndexMsg(msg);
                break;
            case constants.SEARCH_T:
                clearTimeout(this.awaiting_acks[msg.sender_id]);
                handleSearchMsg(msg);
                break;
            case constants.SEARCHR_T:
                clearTimeout(this.awaiting_acks[msg.sender_id]);
                handleSearchResponseMsg(msg);
                break;
            case constants.PING_T:
                clearTimeout(this.awaiting_acks[msg.sender_id]);
                handlePingMsg(msg);
                break;
            case constants.ACK_T:
                clearTimeout(this.awaiting_acks[msg.node_id]);
                break;
        }
    }.bind(this);

    var handleJoiningMsg = function handleJoiningMsg(msg) {
        var msg2,
            gateway = this.id;
        if (msg.ip_address) {
            ack(msg.ip_address);
            msg2 = messages.join_relay(msg.node_id, this.id);
            route(msg.node_id, function(id) {
                if (id !== this.id) {
                    send(msg2, id);
                }
                this.routing_table[msg.node_id] = msg.ip_address;
                console.log(this.routing_table);
            }.bind(this));
        } else {
            gateway = msg.gateway_id;
            route(msg.node_id, function(id) {
                if (id !== this.id) send(msg, id);
            }.bind(this));
        }
        msg2 = messages.routing_info(msg.node_id, gateway, this.ip_address,
                Object.keys(this.routing_table).map(function(nid) {
                    return { node_id: nid, ip_address: this.routing_table[nid] };
                }.bind(this)));
        console.log("GATEWAY %s : ID %s", gateway, this.id);
        if (gateway === this.id) send(msg2, msg.node_id);
        else {
            route(gateway, function(id) {
                send(msg2, id, true);
            });
        }
    }.bind(this);

    var handleRoutingMsg = function handleRoutingMsg(msg) {
        async.each(msg.route_table, function(route) {
            this.routing_table[route.node_id] = route.ip_address;
        }.bind(this), function (err) {
            if (err) throw err;
        });
        if (msg.node_id === this.id) return;
        if (msg.gateway_id === this.id) {
            send(messages.routing_info(msg.node_id, this.id, this.ip_address, Object.keys(this.routing_table).map(function(nid) {
                    return { node_id: nid, ip_address: this.routing_table[nid] };
                }.bind(this))), msg.node_id);
        } else {
            route(msg.gateway_id, function(id) {
                if (id === this.id) {
                    send(new Buffer(msg), msg.node_id);
                } else {
                    send(new Buffer(msg), id);
                }
            }.bind(this));
        }
    }.bind(this);

    var handleLeavingMsg = function handleLeavingMsg(msg) {
        clearTimeout(this.awaiting_acks[msg.node_id]);
        delete this.awaiting_acks[msg.node_id];
        delete this.routing_table[msg.node_id];
    }.bind(this);

    var handleIndexMsg = function handleIndexMsg(msg) {
        ack(this.routing_table[msg.sender_id]);
        route(msg.target_id, (function(id) {
            if (id === this.id) {
                if (!this.storage[msg.keyword]) this.storage[msg.keyword] = [];
                this.storage[msg.keyword] = this.storage[msg.keyword].concat(msg.link);
            } else {
                send(msg, id);
            }
        }).bind(this));
    }.bind(this);

    var handleSearchResponseMsg = function handleSearchResponseMsg(msg) {
        this.pending_results[msg.word] = this.pending_results[msg.word].concat(msg.response);
    }.bind(this);

    var handlePingMsg = function handlePingMsg(msg) {
        ack(msg.ip_address);
        if (msg.target_id !== this.id) {
            ping(msg.target_id, msg.sender_id);
        }
    }.bind(this);

    var handleSearchMsg = function handleSearchMsg(msg) {
        ack(this.routing_table[msg.sender_id]);
        route(msg.sender_id, function(id) {
            send(messages.search_response(msg.word, msg.sender_id, this.id, this.storage[msg.word] || []), id, true);
        }.bind(this));
        route(msg.node_id, function(id) {
            if (id !== this.id) send(new Buffer(msg), msg.node_id, true);
        }.bind(this));
    }.bind(this);

    this.socket.on('message', handle_incoming);
}
