### From CS4032 Wiki

[Main: Official Specification](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main) {.pagename}
=======================================================================================================

NOTE FOR ALL: you should feel free to make any modifications to the
interfaces defined herein to cope with variations in languages or indeed
errors in definitions. Just note these changes in a README file or makes
comments in your code. Providing your changes keep with the spirit of
the problem this will be fine.

This is the official specification for the P2P Web Search System that
you are tasked with providing an individual implementation for. Your
implementation will be tested for adherence to this specification.

**Note:** In the following text, the phrase "along the normal channel"
or "in the normal way" should be taken to refer to the routing of
messages through the overlay network, hopping from node to node as each
message is passed on to a node closer to it's eventual destination. This
is in contrast to "directly" which should be taken to mean a direct
socket connection from source to target.

-   **[Update: I have made a few modifications to the spec (noted as
    'updates') to fix one problem with message acknowledgement and to
    clarify the purpose of some message elements.]**
-   [Update: I changed the type of ip address parameters in API to the
    type InetSocketAddress, which allows you to pass ip address and port
    - this should make it easier to test on a single machine by creating
    nodes with different ports but the same ip address. Note that your
    routing tables would need to keep ip address/port number
    combinations to send messages, not just the ip address. Note that
    you still initialise a node by passing a datagram socket which you
    will initialise to a specific port number before passing in.]
-   [UPDATE: as we must stick to a December 23rd deadline, we have
    agreed a simplification that you may opt to implement instead of the
    full solution. This simplification is to assume that all messages
    are addressed to a target identifier that matches exactly to an
    identifier of an existing node in the network. There is thus no
    requirement to route message to the node with an identifier
    "nearest" to that of the message target. This means you do not have
    to be concerned about maintaining leaf node sets, nor need you be
    concerned about nodes leaving the network such that messages
    intended for them could no longer reach such nodes. In order to make
    this simplification possible, the joining aspect of the protocol
    must be modified slightly. I have adjusted the specification to
    include two Library interface elements. You may choose which you
    prefer to implement.]

Library Interface

You should implement your solution as a library with a skeleton mainline
driving execution. The library should implement the following interface
(this assuming Java - if you use some other platform you should provide
an equivalent separation between driving program and functional
library).

\
 class SearchResult{\
    String words; // strings matched for this url\
    String[] url;   // url matching search query \
    long frequency; //number of hits for page\
 }\
 \
 interface PeerSearch {\
     void init(DatagramSocket udp\_socket); // initialise with a udp
socket\
     long joinNetwork(InetSocketAddress bootstrap\_node); //returns
network\_id, a locally \
                                        // generated number to identify
peer network\
     boolean leaveNetwork(long network\_id); // parameter is previously
returned peer network identifier\
     void indexPage(String url, String[] unique\_words);\
     SearchResults[] search(String[] words)\
 }\
 \
 // for the simplified routing solution\
 interface PeerSearchSimplified {\
     void init(DatagramSocket udp\_socket); // initialise with a udp
socket\
     long joinNetwork(InetSocketAddress bootstrap\_node, string
identifier, string target\_identifier ); //returns network\_id, a
locally \
                                        // generated number to identify
peer network\
     boolean leaveNetwork(long network\_id); // parameter is previously
returned peer network identifier\
     void indexPage(String url, String[] unique\_words);\
     SearchResults[] search(String[] words)\
 }\
  

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=1)

Note that the PeerSearchSimplified interface includes a modified
joinNetwork method in which two additional parameters are passed. The
first parameter, named 'identifier', is the overlay network identifier
that the node should use to identify itself. The second parameter, named
'target\_identifier', is the identifier of the node the join request
should be routed to. In the normal implementation, a node would generate
an identifier randomly and simply send the join request into the
network, that request ultimately being delivered to the node with an
identifier numerically closest to that randomly generated identifier.
The simplified specification for routing, which guarantees that no
message will be sent to a target that does not identify an existing
node, requires that we target join messages to a node we know exists.
This necessitates the generation and selection of identifiers from
outside your library. It might be used as follows (note in the
joinNetwork call the first parameter wouldn't really be a string,but
hopefully you get the idea):

class ExampleTest {\
 void buildNetwork() {\
    // ... lots of initialisation of nodes\
 \
    PeerSearchSimplified node1 = generateInstance();\
    node2.init(createSocket());\
    node2.joinNetwork("192.196.226.3", "boyzone","abba"); // boy zone
join message routes to abba\
 \
    PeerSearchSimplified node1 = generateInstance();\
    node3.init(createSocket());\
    node3.joinNetwork("192.196.226.3", "kyle","boyzone"); // kyle join
message routes to boy zone\
 \
    // ... lots more initialisation of nodes\
 }\
 void test() {\
    node13.indexPage("http://somepage.com", ["abba"]); // this message
would route to abba node\
    SearchResults results = node13.search(["boyzone"]); // this message
would route to boyzone node\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=2)

Note that the interface includes an init method for the passing of a udp
socket. This is important. The udp socket passed should be used in all
communication.

Hashing

For test purposes, you may consider your implementation complete if it
operates correctly in the following circumstances:

1.  Each node is identified by an id being the hash of a specific word.
2.  Under test, that node will be responsible for indexing for that word
    only. No word will be submitted for which a node with an id matching
    precisely the hash of the submitted word does not exist.
3.  You need not therefore be concerned with identifying the node whose
    id is closest to the hash of the word, but may instead assume that
    the hash of a word will match to one node exactly. This removes the
    need to consider leaf sets, the maintenance of leaf sets and
    matching against leaf sets for final delivery. Final delivery occurs
    when a message arrives at a node with an id identical to the target.

The following code (derived from the Java String hashCode
implementation) should be used for generating an integer from a keyword.
This integer is then to be used as the target identity for any message
intended for a target matching, or responsible for the keyword.

We had some discussion in class over changing the has function to avoid
negative numbers. I believe that for our purposes, a more simple
solution is to simply return the positive absolute value of the hash
function, so I have amended the function accordingly:

public int hashCode(String str) {\
   int hash = 0;\
   for (int i = 0; i \< str.length(); i++) {\
     hash = hash \* 31 + str.charAt(i);\
   }\
   return Math.abs(hash);\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=3)

Socket Communication, Port Number, etc.

All nodes will be identified by an integer (i.e. 2^32^). For assessment,
you will be assigned a number and should use it to identify your
implementation. For development you can use numbers as you see fit.

All communication will be via UDP to port 8767. A server will listen for
any UDP message sent to that port, consuming all messages on a first
come first served basis. Note that you need not process messages
sequentially (you may for example pass handling to a thread pool). All
messages should be formatted in JSON format, either using JSON
libraries, or alternatively by following the message descriptions in
this text exactly(with the exception of comments, which MUST be
omitted).

To start a network, a first node must be initialised as a bootstrap
node. Your implementation should accept a command line parameter "--boot
[Integer Identifier 2^32^]" and if passed must become the first node.
The first node will open a UDP port 8767 and wait for connections. The
bootstrap node may leave the network once at least one node is
connected.

Joining and Leaving

A node wishing to join the network must have the ip address of a node
presently known to be connected to the network (the bootstrap node may
be available but is not guaranteed). The initial node ip address and the
identifier for this node should be sent to the system via a command line
parameter "--bootstrap [IP Address] --id [Integer Identifier 2^32^]".

To join the network, a JOINING\_NETWORK message is sent directly to a
known node in the network (hereafter called the gateway node). This is
most likely the initial bootstrap node, but may be any node in the
network. This message is sent as a UDP message.

Once the gateway node has received a JOINING\_NETWORK message, it
replies via UDP with a ROUTING\_INFO message, and if appropriate (see
section on routing below), forwards the JOINING\_NETWORK\_RELAY message
to a node in the network with an identifier numerically closer to that
of the target. This message gets transferred along the network from node
to node until it reaches it's final target. Each node receiving this
message should send a ROUTING\_INFO message to the gateway node, who
should relay the ROUTING\_INFO message directly (via UDP) to the joining
node. In effect the gateway node acts as a message aggregator, enabling
ROUTING\_INFO messages to be sent across the overlay network towards the
joining node, before direct gateway to joining node transmission.

The ROUTING\_INFO message should contain the full routing table of the
sending node. On receipt by the joining node, this routing information
should be merged into the routing table of the receiving node. Any node
receiving a ROUTING\_INFO message is free to incorporate some, all or
none of the routing info into it's own routing tables.

In the case of graceful shutdown, a node planning to leave the network
should send a LEAVING\_NETWORK message to the nodes in it's routing
table. This message is not acknowledged by the recipient and nodes may
leave without sending these messages.

The relevant messages are defined below:

-   JOINING\_NETWORK

{\
     "type": "JOINING\_NETWORK", // a string\
     "node\_id": "42", // a non-negative number of order 2'\^32\^',
indicating the target node (and also the id of the joining node).\
     "ip\_address": "199.1.5.2" // the ip address of the joining node\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=4)

The following variation is the message to use if you are implementing
the simplified protocol.

-   JOINING\_NETWORK\_SIMPLIFIED

{\
     "type": "JOINING\_NETWORK\_SIMPLIFIED", // a string\
     "node\_id": "42", // a non-negative number of order 2'\^32\^',
indicating the id of the joining node).\
     "target\_id": "42", // a non-negative number of order 2'\^32\^',
indicating the target node for this message.\
     "ip\_address": "199.1.5.2" // the ip address of the joining node\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=5)

**[update: I have renamed bootstrap\_id to gateway\_id to hopefully make
it clearer that this element should be set to the id of the node that is
acting as the gateway through all which all routing info should pass
before being sent directly to the joining node]**

**[update: Fixed the message type for JOINING\_NETWORK\_RELAY]**

-   JOINING\_NETWORK\_RELAY

{\
     "type": "JOINING\_NETWORK\_RELAY", // a string\
     "node\_id": "42", // a non-negative number of order 2'\^32\^',
 indicating the target node (and also the id of the joining node).\
     "gateway\_id": "34", // a non-negative number of order 2'\^32\^',
of the gateway node\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=6)

The following variation is the message to use if you are implementing
the simplified protocol.

-   JOINING\_NETWORK\_RELAY\_SIMPLIFIED

{\
     "type": "JOINING\_NETWORK\_RELAY\_SIMPLIFIED", // a string\
     "node\_id": "42", // a non-negative number of order 2'\^32\^',
indicating the id of the joining node).\
     "target\_id": "42", // a non-negative number of order 2'\^32\^',
indicating the target node for this message.\
     "gateway\_id": "34", // a non-negative number of order 2'\^32\^',
of the gateway node\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=7)

-   ROUTING\_INFO

{\
     "type": "ROUTING\_INFO", // a string\
     "gateway\_id": "34", // a non-negative number of order 2'\^32\^',
of the gateway node\
     "node\_id": "42", // a non-negative number of order 2'\^32\^',
indicating the target node (and also the id of the joining node).\
     "ip\_address": "199.1.5.2" // the ip address of the node sending
the routing information\
     "route\_table":\
     [\
         {\
             "node\_id": "3", // a non-negative number of order
2'\^32\^'.\
             "ip\_address": "199.1.5.3" // the ip address of node 3\
         },\
         {\
             "node\_id": "22", // a non-negative number of order
2'\^32\^'.\
             "ip\_address": "199.1.5.4" // the ip address of  node 22\
         }\
     ]\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=8)

-   LEAVING\_NETWORK

{\
     "type": "LEAVING\_NETWORK", // a string\
     "node\_id": "42", // a non-negative number of order 2'\^32\^'
identifying the leaving node.\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=9)

Routing

Each node will maintain a data structure equivalent in function to the
pastry routing table. You may use that structure of any other as you see
fit. Your solution must implement prefix routing as described in Pastry,
in that given a message with a destination id, it must be capable of
passing the message on to a node at least one 'digit' closer to the
final destination.

Your solution must be capable of merging any routing information it
receives from other nodes as it arrives. You may cache any routing data
you receive in passing within messages and update your routing data
accordingly.

Indexing

In response to a request to index a url against a set of words, a set of
INDEX messages should be sent on the network, one for each word passed,
each message including as the target node\_id the hash code of the word
and other details as follows:

**[ update: please note that I have modified this data structure to
include the id of the sending node so that ACK messages can be returned
to sending\_id. I have also renamed elements to hopefully be clearer. I
have also redefined the link element as a list, to allow you to batch
the sending of INDEX information regarding multiple links.]**

-   INDEX

{\
     "type": "INDEX", //string\
     "target\_id": "34", //the target id\
     "sender\_id": "34", // a non-negative number of order 2'\^32\^', of
the message originator\
     "keyword": "XXX", //the word being indexed\
     "link": [\
                "http://www.newindex.com", // the url the word is found
in\
                "http://www.xyz.com"\
               ]\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=10)

When an index message is received, the word-link tuple should be stored
in local storage in any fashion that facilitates later retrieval for
search requests. The node should also keep a count of the number of
times the word has appeared for the particular url.

Searching

In response to a request to search for a set of words, a set of SEARCH
messages should be sent on the network, one for each word passed, each
message including as the target node\_id the hash code of the word and
other details as indicated in the SEARCH message description below. The
node should then wait for a set of SEARCH\_RESPONSE messages to be
received. After a timeout (3 seconds), the responses that have been
received should be aggregated and a response returned. After 30 seconds,
any as yet non-recieved responses should cause PING messages to be sent
as described below in the section "Message Acknowledgement".

**[update: If a SEARCH message is received at a node,**all**results
should be retrieved from local storage and a SEARCH\_RESPONSE message
should be constructed and returned in the normal way. If no results are
available, then a null SEARCH\_RESPONSE message should still be sent.]**

-   SEARCH

{\
     "type": "SEARCH", // string\
     "word": "apple", // The word to search for\
     "node\_id": "34",  // target node id\
     "sender\_id": "34", // a non-negative number of order 2'\^32\^', of
this message originator\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=11)

-   SEARCH\_RESPONSE

{\
     "type": "SEARCH\_RESPONSE",\
     "word": "word", // The word to search for\
     "node\_id": "45",  // target node id\
     "sender\_id": "34", // a non-negative number of order 2'\^32\^', of
this message originator\
     "response":\
     [\
         {\
             url: "www.dsg.cs.tcd.ie/",  //url\
             rank: "32"  //rank\
         },\
         {\
              url: "www.scss.tcd.ie/courses/mscnds/",  //url\
              rank: "1" //rank\
         }\
     ]\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=12)

The rank is calculated as the simple count of times the particular url
has been received at the node as a a match for the word. Remember that
we expect to receive these index messages from a number of nodes in the
network. Thus if, for example, 20 nodes caused index messages to be sent
in respect of [http://www.dsg.scss.tcd.ie](http://www.dsg.scss.tcd.ie),
for the word "component", then the rank will accumulate to 20. ie. we
are not counting the number of times the word appears in a page, but
rather the number of unique times the url is indexed for the word.

Message Acknowledgement.

Because the specification calls for UDP messaging, it is not possible to
identify whether messages are transferred from one node to the next
reliably. The following protocol, derived loosely from the bully
algorithm seeks to prompt nodes to update routing information via a PING
passed through the network following a failed transmission of another
message, testing and pruning the route.

For an INDEX message sent by a node, the receipt by the target should be
acknowledged by an ACK message sent via the overlay network. These
messages should be received within 30 seconds by the original node. If
an ACK message, or alternative communication is not received in that
timeframe, the original node should attempt to send a PING message to
the same target and wait for an ACK message. The PING message proceeds
in the normal way through the overlay network. At each stage, on receipt
of a PING message, a node should send an ACK message directly (i.e.
using the ip address) to the immediate sender of the PING message (i.e.
not the originator of the PING message), and should send a PING message
on to the next node as appropriate. If the node is the final target of
the PING, it should cease processing.

Thus, the PING passing from node to node merely confirms the route if it
arrives at the destination, or causes some node along the route to prune
a failing step. It does not result in confirmation of the route being
returned to the originator of the initial PING - in a volatile network
with constantly changing routes, this would not be not useful.

If an expected ACK message is not received within 10 seconds the node
waiting should remove the node to which the PING message was sent from
the routing table.

**[ update: I have modified this message slightly to hopefully clarify
elements. in the PING message, the target\_id sender\_id couplet
effectively identify the route being tested. The sender\_id is strictly
speaking not necessary to implement the protocol, but please include
it.]**

-   PING

{\
     "type": "PING", // a string\
     "target\_id": "23", // a non-negative number of order 2'\^32\^',
identifying the suspected dead node.\
     "sender\_id": "56", // a non-negative number of order 2'\^32\^',
identifying the originator \
                                //    of the ping (does not change)\
    "ip\_address": "199.1.5.4" // the ip address of  node sending the
message (changes each hop)\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=13)

-   ACK

{\
     "type": "ACK", // a string\
     "node\_id": "23", // a non-negative number of order 2'\^32\^',
identifying the suspected dead node.\
     "ip\_address": "199.1.5.4" // the ip address of  sending node, this
changes on each hop (or used to hold the keyword in an ACK message
returned following an INDEX message - see note below)\
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=14)

[Update: Some of you may already have noticed that when an ACK is sent
as a response to an INDEX message, the fields must be used in quite a
different way to the PING-ACK call-response. First, the node\_id field
of the ACK message, in the INDEX context is used as the target for the
message routing. Second, the ip\_address field must be used to hold the
keyword of the original INDEX message, or some other unique identifier
(so that the original sender can match the ACK to the original INDEX
request). The key point is that the node\_id field should not include
the ip\_address when used in an INDEX-ACK context.

A better name for the field, given the dual use of the ACK message type,
might be originator\_identifier, still a string of course. This then
might contain an ip address or a keyword depending on the context used.
Treatment of the ACK message would then vary depending on the
originator\_identifier field content. If it's an IP address then it's a
PING-ACK context, otherwise it's an INDEX-ACK context.

I don't propose to change the name of the field as I think this is more
trouble than it's worth now, and no doubt some of you have already
implemented a solution using ip\_address in this way.

However, this overloaded use of the ACK message, with behavioural
switching based on field content is classic bad design :) and if you
find it confusing, I propose the following additional message ACK\_INDEX
variant, that is functionally the same as ACK in terms of capacity to
hold data, but that you might find it easier to reason about and easier
to implement. It is up to you. Implement an ACK\_INDEX or ACK message as
a response to an INDEX request.]

-   ACK\_INDEX

{\
     "type": "ACK\_INDEX", // a string\
     "node\_id": "23", // a non-negative number of order 2'\^32\^',
identifying the target node.\
     "keyword": "fish" // the keyword from the original INDEX message \
 }

[[\$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=15)

Retrieved from
https://www.scss.tcd.ie/\~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official

Page last modified on December 18, 2013, at 06:30 PM
