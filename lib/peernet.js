'use strict';

var dgram = require('dgram');
var async = require('async');
var messages = require('./messages.js');
var constants = require('./constants.js');
var hashit = require('./hashit.js');

module.exports = function PeerNet(id, ip_address, port) {
    this.id = id;
    this.port = port;
    this.ip_address = ip_address;
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(this.port);
    this.storage = {};
    this.pending_results = {};
    this.awaiting_acks = {};
    this.routing_table = {};
    this.routing_table[this.id] = {
        ip: this.ip_address,
        port: this.port
    };

    this.joinNetwork = function joinNetwork(bootstrap_node, bootstrap_port) {
        var msg = messages.join(this.id, this.ip_address, this.port);
        this.socket.send(msg, 0, msg.length, bootstrap_port, bootstrap_node);
    }.bind(this);

    this.leaveNetwork = function leaveNetwork() {
        var msg = messages.leave(this.id);
        async.each(Object.keys(this.routing_table), function(id) {
            this.socket.send(msg, 0, msg.length, this.routing_table[id].port, this.routing_table[id].ip);
        }.bind(this), function(err) {
            if (err) throw err;
        });
    }.bind(this)

    this.search = function search(words, cb) {
        words = words.map(function(word) {
            return function(callback) { return search_word(word,
                                                           this.id,
                                                           this.storage,
                                                           this.pending_results,
                                                           this.routing_table,
                                                           this.awaiting_acks,
                                                           this.socket,
                                                           callback);
            }.bind(this);
        }.bind(this));
        async.parallel(words, function(err, results) {
            if (err) throw err;
            cb(aggregate_results(results));
        });
    }.bind(this);

    this.indexPage = function indexPage(url, words) {
        async.each(words, function(word) {
            index(word, url, this.id, this.storage, this.routing_table, this.awaiting_acks, this.socket);
        }.bind(this), function(err) {
            if (err) throw err;
        })
    }.bind(this);

    var handle_incoming = function handle_incoming(buf) {
        var msg = JSON.parse(buf.toString());
        clearTimeout(this.awaiting_acks[msg.sender_id]);
        switch (msg.type) {
            case constants.JOIN_T:
                handleJoiningMsg(msg,
                                 this.id,
                                 this.ip_address,
                                 this.routing_table,
                                 this.awaiting_acks,
                                 this.socket);
                break;
            case constants.JOINR_T:
                handleJoinRelayMsg(msg,
                                   this.id,
                                   this.ip_address,
                                   this.routing_table,
                                   this.awaiting_acks,
                                   this.socket);
                break;
            case constants.ROUTING_T:
                handleRoutingMsg(msg,
                                 this.id,
                                 this.routing_table,
                                 this.ip_address,
                                 this.awaiting_acks,
                                 this.socket);
                break;
            case constants.LEAVING_T:
                handleLeavingMsg(msg, this.awaiting_acks, this.routing_table);
                break;
            case constants.INDEX_T:
                handleIndexMsg(msg,
                               this.id,
                               this.storage,
                               this.routing_table,
                               this.awaiting_acks,
                               this.ip_address,
                               this.port,
                               this.socket);
                break;
            case constants.SEARCH_T:
                handleSearchMsg(msg, this.id, this.ip_address, this.storage, this.routing_table, this.socket);
                break;
            case constants.SEARCHR_T:
                handleSearchResponseMsg(msg,
                                        this.id,
                                        this.ip_address,
                                        this.pending_results,
                                        this.routing_table,
                                        this.awaiting_acks,
                                        this.socket);
                break;
            case constants.PING_T:
                handlePingMsg(msg,
                              this.id,
                              this.ip_address,
                              this.port,
                              this.routing_table,
                              this.awaiting_acks,
                              this.socket);
                break;
            case constants.ACK_T:
                clearTimeout(this.awaiting_acks[msg.node_id]);
                break;
        }
    }.bind(this);

    this.socket.on('message', handle_incoming);
}

function search_word(word, id, storage, pending_results, routing_table, awaiting_acks, socket, cb) {
    if (!(word in pending_results)) pending_results[word] = [];
    var msg = messages.search(word, hashit(word), id);
    route(hashit(word), id, routing_table, function(route_id) {
        if (route_id !== id) {
            send(msg, route_id, id, routing_table, awaiting_acks, socket);
            setTimeout(function() {
                cb(null, {"word": word, "results": pending_results[word]});
                pending_results[word] = [];
            }, 3000);
        } else {
            cb(null, {"word": word, "results": storage[word] || []});
        }
    });
}

function index(word, url, id, storage, routing_table, awaiting_acks, socket) {
    var hash = hashit(word);
    var msg = messages.index(hash, id, word, url);
    route(hash, id, routing_table, function(route_id) {
        if (route_id !== id) {
            send(msg, route_id, id, routing_table, awaiting_acks, socket);
        } else {
            msg = JSON.parse(msg.toString());
            if (!storage[msg.keyword]) storage[msg.keyword] = [];
            for (var link in storage[msg.keyword]) {
                if (storage[msg.keyword][link].url === msg.link) {
                    storage[msg.keyword][link].rank++;
                    return;
                }
            }
            storage[msg.keyword] = storage[msg.keyword].concat({
                url: msg.link,
                rank: 1
            });
        }
    })
}

/*
 * Results parameter is a list of result objects, where a result is a subset of
 * the SEARCH_RESPONSE message type with the form:
 *
 * {
 *      "word": "foo",
 *      "results": [{
 *                     "url":  "www.dsg.cs.tcd.ie",
 *                     "rank": 32
 *                 },...]
 * }
 *
 * The results parameter contains one such field for each search term in the
 * user's original search. `aggregate_results` performs a two dimensional
 * fold across this datastructure to produce a final result:
 *
 * {
 *      "www.dsg.cs.tcd.ie": {
 *                              "words": ["foo", "bar", etc...],
 *                              "frequency": 160
 *                           },
 *      "www.google.com": {...},
 *      ...
 * }
 *
 * With a key for each url in the results containing a words/frequency pair,
 * where "words" is a list containing all words from the "word" field in the
 * input to the function whose "results" contained the URL, and the frequency
 * field being the sum of all ranks for appearances of the URL.
 */
function aggregate_results(results) {
    return results.reduce(function (acc, row) {
        return row.results.reduce(function (partial, result) {
            if (!(result.url in partial)) {
                partial[result.url] = {
                    "words": [row.word],
                    "frequency": result.rank
                };
            } else {
                partial[result.url].words.push(row.word);
                partial[result.url].frequency += result.rank;
            }
            return partial;
        }, acc);
    }, {});
}

/*
 * Asynchronously calculates the ID (key) in the routing_table parameter that is
 * closest to "target".
 */
function route(target, id, routing_table, cb) {
    cb(Object.keys(routing_table).reduce(function(acc, id) {
        return Math.abs(id - target) < Math.abs(acc - target) ? id : acc;
    }, id));
}

/*
 * Utility function that automates the process of sending messages to the
 * correct IP address and port and establishing timeouts.
 */
function send(msg, target_id, id, routing_table, awaiting_acks, socket, options) {
    socket.send(msg, 0, msg.length, routing_table[target_id].port, routing_table[target_id].ip);
    if (!(options && options.no_ping)) {
        clearTimeout(awaiting_acks[target_id]);
        awaiting_acks[target_id] = setTimeout(function() {
            ping(target_id, null, id, routing_table, awaiting_acks, socket);
        }, 30000);
        awaiting_acks[target_id].reason = JSON.parse(msg.toString()).type
    }
}


/*
 * Hanlder function invoked on the receipt of a JOINING_NETWORK message.
 *
 * Attempts to calculate the closest known node to the newly joining node.
 * If that node is not the current node, a JOINING_NETWORK_RELAY message
 * is dispatched towards it. Only after dispatching the RELAY message is
 * the new node added to the routing table, and finally this node's routing
 * info is dispatched to the joining node.
 */
function handleJoiningMsg(msg, id, ip_address, routing_table, awaiting_acks, socket) {
    route(msg.node_id, id, routing_table, function(route_id) {
        if (route_id !== id) {
            var relay = messages.join_relay(msg.node_id, id)
            send(relay, route_id, id, routing_table, awaiting_acks, socket);
        }
        routing_table[msg.node_id] = {
            ip: msg.ip_address,
            port: msg.port
        };
        sendRoutingInfo(id, msg.node_id, id, ip_address, routing_table, awaiting_acks, socket);
    });
}

/*
 * Utility function that simplifies the process of sending a ROUTING_INFO
 * message. This function handles constructing the message from the given
 * routing_table and dispatching it to the correct recipient.
 */
function sendRoutingInfo(gateway_id, node_id, id, ip_address, routing_table, awaiting_acks, socket) {
    var routing_info = messages.routing_info(node_id, gateway_id, ip_address,
            Object.keys(routing_table).map(function(nid) {
                return { node_id: nid,
                         "ip_address": routing_table[nid].ip,
                         port: routing_table[nid].port };
            })
    );
    if (gateway_id === id) {
        send(routing_info, node_id, id, routing_table, awaiting_acks, socket, { no_ping: true });
    } else {
        route(gateway_id, id, routing_table, function(route_id) {
            send(routing_info, route_id, id, routing_table, null, socket, { no_ping: true });
        });
    }
};

/*
 * Handler function invoked on receipt of a JOINING_NETWORK_RELAY message.
 *
 * 1. Forward the message towards its intended destination, unless we are the
 *    ultimate receiver or the closest known node.
 *
 * 2. Send routing info to the originator of the JOINING_NETWORK_RELAY message.
 */
function handleJoinRelayMsg(msg, id, ip_address, routing_table, awaiting_acks, socket) {
    route(msg.node_id, id, routing_table, function(route_id) {
        if (route_id !== id) send(msg, route_id, id, routing_table, awaiting_acks, socket, { no_ping: true });
    });
    sendRoutingInfo(msg.gateway_id, msg.node_id, id, ip_address, routing_table, awaiting_acks, socket);
}

/*
 * Handler function invoked on receipt of a ROUTING_INFO message.
 *
 * Regardless of whether we are the intended recipient of the message, inspect
 * the contents and add all routes contained within to our routing_table.
 *
 * If we prove to have been the intended recipient we are done at this point.
 *
 * If not, create a new ROUTING_INFO message from our routing table (which must
 * now be easier the same or a greater set than the original message) and forward
 * it towards the gateway. No special steps must be taken to forward the message
 * to the intended recipient. (sendRoutingInfo handles the case where we are
 * the gateway node).
 */
function handleRoutingMsg(msg, id, routing_table, ip_address, awaiting_acks, socket) {
    async.each(msg.route_table, function(route) {
        routing_table[route.node_id] = {
            ip: route.ip_address,
            port: route.port
        };
    }, function (err) {
        if (err) throw err;
    });
    if (msg.node_id === id) return;
    else sendRoutingInfo(msg.gateway_id, msg.node_id, id, ip_address, routing_table, awaiting_acks, socket);
};

/*
 * Handler function invoked on receipt of a LEAVING message.
 *
 * 1. Clear all pending timers related to the node leaving the network.
 * 2. Delete node from routing table.
 */
function handleLeavingMsg(msg, awaiting_acks, routing_table) {
    clearTimeout(awaiting_acks[msg.node_id]);
    delete awaiting_acks[msg.node_id];
    delete routing_table[msg.node_id];
}

/*
 * Handler function invoked on receipt of a PING message.
 *
 * Immediately on receipt of a PING message an ACK message is sent directly to
 * the person who last forwarded the message to us, by IP (see ackDirect)
 *
 * Then, if we are not the target, the ping is forwarded its actual destination.
 */
function handlePingMsg(msg, id, ip_address, port, routing_table, awaiting_acks, socket) {
    ackDirect(msg.target_id, msg.ip_address, msg.port, ip_address, port, socket);
    if (msg.target_id !== id) {
        ping(msg.target_id,
             msg.sender_id,
             id,
             routing_table,
             awaiting_acks,
             socket);
    }
}

/*
 * Handler function invoked on receipt of an INDEX message.
 *
 * Immediately on receipt of an INDEX message an ACK message is sent back
 * via the overlay network. (see ackRoute). The packet is then routed
 * forwards to the next receiver closest to its target.
 *
 * If the current node is the closest known node to the target, the contents
 * of the INDEX message are saved in this node's `storage`.
 */
function handleIndexMsg(msg, id, storage, routing_table, awaiting_acks, ip_address, port, socket) {
    ackRoute(msg.target_id, msg.sender_id, id, routing_table, ip_address, port, socket);
    route(msg.target_id, id, routing_table, function(route_id) {
        if (route_id === id) {
            if (!storage[msg.keyword]) storage[msg.keyword] = [];
            for (var link in storage[msg.keyword]) {
                if (storage[msg.keyword][link].url === msg.link) {
                    storage[msg.keyword][link].rank++;
                    return;
                }
            }
            storage[msg.keyword] = storage[msg.keyword].concat({
                url: msg.link,
                rank: 1
            });
        } else {
            send(new Buffer(msg), route_id, id, routing_table, awaiting_acks, socket);
        }
    });
}

/*
 * Handler function invoked on receipt of a SEARCH message.
 *
 * Two steps are taken on receiving a SEARCH message:
 *
 *      1. SEARCH_RESPONSE message sent back towards the originator of the search.
 *      2. Received SEARCH message is forwarded to the next person in the network,
 *         unless we are the ultimate receiver or the closest known node.
 */
function handleSearchMsg(msg, id, ip_address, storage, routing_table, socket) {
    var response = messages.search_response(msg.word, msg.sender_id, id, storage[msg.word] || []);
    var sender_id = msg.sender_id, node_id = msg.node_id;
    msg = new Buffer(JSON.stringify(msg));
    route(sender_id, id, routing_table, function(route_id) {
        send(response, route_id, id, routing_table, null, socket, { no_ping: true });
    });
    route(node_id, id, routing_table, function(route_id) {
        if (route_id !== id) send(msg, route_id, id, routing_table, null, socket, { no_ping: true });
    });
}

/*
 * Handler function invoked on receipt of a SEARCH_RESPONSE message.
 *
 * Adds the results from the message to our pending results if we are
 * currently waiting for results for the word in this SEARCH_RESPONSE.
 *
 * If we are not the ultimate receiver of the message (or the closest
 * known node to the ultimate receiver), the message is forwarded to
 * the next closest node we know of in network from our routing table.
 */
function handleSearchResponseMsg(msg, id, ip_address, pending_results, routing_table, awaiting_acks, socket) {
    var response = new Buffer(JSON.stringify(msg));
    if (msg.word in pending_results) {
        pending_results[msg.word] = pending_results[msg.word].concat(msg.response);
    }
    route(msg.node_id, id, routing_table, function(route_id) {
        if (route_id !== id) {
            send(response, route_id, id, routing_table, awaiting_acks, socket);
        }
    });
}

/*
 * Sends a PING message to suspect_id via the overlay network. If no response
 * is received after 10 seconds, suspect_id is deleted from the routing table.
 */
function ping(suspect_id, source_id, id, routing_table, awaiting_acks, socket) {
    route(suspect_id, id, routing_table, function(route_id) {
        if (route_id === id) return;
        var msg = messages.ping(source_id || id, suspect_id, routing_table[id].ip, routing_table[id].port);
        send(msg, route_id, id, routing_table, awaiting_acks, socket, { no_ping: true });
        awaiting_acks[suspect_id] = setTimeout(function() {
            delete awaiting_acks[suspect_id];
            delete routing_table[suspect_id];
        }, 10000);
    });
}

/*
 * Sends an ACK message routed via the overlay network to `suspect_id`.
 */
function ackRoute(suspect_id, sender_id, id, routing_table, ip_address, port, socket) {
    route(sender_id, id, routing_table, function(route_id) {
        if (route_id !== id) {
            var msg = messages.ack(suspect_id, ip_address, port);
            /
function ackDirect(id, target_ip, target_port, ip_address, port, socket) {
    var msg = messages.ack(id, ip_address, port);
    socket.send(msg, 0, msg.length, target_port, target_ip);
}
