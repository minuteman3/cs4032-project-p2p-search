module.exports = {
    join: join_msg,
    join_relay: join_relay_msg,
    routing_info: routing_info_msg,
    leave: leave_msg,
    index: index_msg,
    search: search_msg,
    search_response: search_response_msg,
    ping: ping_msg,
    ack: ack_msg
};

var constants = require('./constants.js');


function join_msg(id, ip) {
    var msg = {
        type: constants.JOIN_T,
        node_id: id,
        ip_address: ip
    };
    return new Buffer(JSON.stringify(msg));
}

function join_relay_msg(id, bs_id) {
    var msg =  {
        type: constants.JOINR_T,
        node_id: id,
        gateway_id: bs_id
    };
    return new Buffer(JSON.stringify(msg));
}

function routing_info_msg(id, bs_id, ip, rtable) {
    var msg = {
        type: constants.ROUTING_T,
        gateway_id: bs_id,
        node_id: id,
        ip_address: ip,
        route_table: rtable
    };
    return new Buffer(JSON.stringify(msg));
}

function leave_msg(id) {
    var msg = {
        type: constants.LEAVING_T,
        node_id: id
    };
    return new Buffer(JSON.stringify(msg));
}

function index_msg(id, s_id, k_id, url) {
    var msg = {
        type: constants.INDEX_T,
        node_id: id,
        sender_id: s_id,
        keyword: k_id,
        link: url
    };
    return new Buffer(JSON.stringify(msg));
}

function search_msg(term, id, sender) {
    var msg = {
        type: constants.SEARCH_T,
        word: term,
        node_id: id,
        sender_id: sender
    };
    return new Buffer(JSON.stringify(msg));
}

function search_response_msg(term, id, sender, results) {
    var msg = {
        type: constants.SEARCHR_T,
        word: term,
        node_id: id,
        sender_id: sender,
        response: results
    };
    return new Buffer(JSON.stringify(msg));
}

function ping_msg(sender, id, ip) {
    var msg = {
        type: constants.PING_T,
        sender_id: sender,
        target_id: id,
        ip_address: ip
    }
    return new Buffer(JSON.stringify(msg));
}

function ack_msg(id, ip) {
    var msg = {
        type: constants.ACK_T,
        node_id: id,
        ip_address: ip
    }
    return new Buffer(JSON.stringify(msg));
}
