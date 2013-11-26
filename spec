[![CS4032
Wiki](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/pub/skins/pmwiki/pmwiki-32.gif)](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php)

[Recent
Changes](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.RecentChanges)
-
[Search](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Site.Search):

-   [HomePage](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.HomePage)
-   [WikiSandbox](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.WikiSandbox)

[PmWiki](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=PmWiki.PmWiki)

-   [Basic
    Editing](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=PmWiki.BasicEditing)
-   [Documentation
    Index](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=PmWiki.DocumentationIndex)
-   [PmWiki
    FAQ](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=PmWiki.FAQ)

[edit
SideBar](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Site.SideBar?action=edit)

-   [View](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official)
-   [Edit](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=edit)
-   [History](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=diff)
-   [Print](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=print)

[Main](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main)
/

Official Specification
======================

This is the official specification for the P2P Web Search System that
you are tasked with providing an individual implementation for. Your
implementation will be tested for adherence to this specification.

**Note:** In the following text, the phrase "along the normal channel"
or "in the normal way" should be taken to refer to the routing of
messages through the overlay network, hopping from node to node as each
message is passed on to a node closer to it's eventual destination. This
is in contrast to "directly" which should be taken to mean a direct
socket connection from source to target.

Library Interface

You should implement your solution as a library with a skeleton mainline
driving execution. The library should implement the following interface
(this assuming Java - if you use some other platform you should provide
an equivalent separation between driving program and functional
library).

\
 class SearchResult{\
 String[] words; // strings matched for this url\
 String url; // url matching search query \
 long frequency; //number of hits for page\
 }\
 \
 interface PeerSearch {\
 void init(DatagramSocket udp\_socket); // initialise with a udp socket\
 long joinNetwork(IPAddress bootstrap\_node); //returns network\_id, a
locally \
 // generated number to identify peer network\
 boolean leaveNetwork(long network\_id); // parameter is previously
returned peer network identifier\
 void indexPage(String url, String[] unique\_words);\
 SearchResults[] search(String[] words)\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=1)

Note that the interface includes an init method for the passing of a udp
socket. This is important. The udp socket passed should be used in all
communication.

Hashing

The following code should be used for generating an integer from a
keyword. This integer is then to be used as the target identity for any
message intended for a target matching, or responsible for the keyword.

public int hashCode(String str) {\
 int hash = 0;\
 for (int i = 0; i < str.length(); i++) {\
 hash = hash \* 31 + str.charAt(i);\
 }\
 return hash;\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=2)

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

To join the network, a JOINING\_NETWORK message is sent to the bootstrap
node via a UDP message.

Once the bootstrap node has received a JOINING\_NETWORK message, it
replies via UDP with a ROUTING\_INFO message, and if appropriate (see
section on routing below), forwards the JOINING\_NETWORK\_RELAY message
to a node in the network with an identifier numerically closer. This
message gets transferred along the network from node to node until it
reaches it's final target. Each node receiving this message should send
a ROUTING\_INFO message to the original bootstrap node, who should relay
that message directly to the joining node. In effect the bootstrap node
acts as a message relay, enabling routing\_info messages to be sent
across the overlay network towards the joining node, before direct
bootstrap to joining node transmission.

The ROUTING\_INFO message should contain the full routing table of the
sending node. On receipt by the target, this routing information should
be merged into the routing table of the receiving node.

In the case of graceful shutdown, a node planning to leave the network
should send a LEAVING\_NETWORK message to the nodes in it's routing
table.

The relevant messages are defined below:

-   JOINING\_NETWORK

{\
 "type": "JOINING\_NETWORK", // a string\
 "node\_id": "42", // a non-negative number of order 2'\^32\^', of the
jointing node\
 "ip\_address": "199.1.5.2" // the ip address of the joining node\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=3)

-   JOINING\_NETWORK\_RELAY

{\
 "type": "JOINING\_NETWORK", // a string\
 "node\_id": "42", // a non-negative number of order 2'\^32\^', of the
jointing node\
 "bootstrap\_id": "34", // a non-negative number of order 2'\^32\^', of
the bootstrap node\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=4)

-   ROUTING\_INFO

{\
 "type": "ROUTING\_INFO", // a string\
 "bootstrap\_id": "34", // a non-negative number of order 2'\^32\^', of
the bootstrap node\
 "node\_id": "4", // a non-negative number of order 2'\^32\^',
indicating the target node.\
 "ip\_address": "199.1.5.2" // the ip address of the node sending the
routing information\
 "route\_table":\
 [\
 {\
 "node\_id": "3", // a non-negative number of order 2'\^32\^'.\
 "ip\_address": "199.1.5.3" // the ip address of node 3\
 },\
 {\
 "node\_id": "22", // a non-negative number of order 2'\^32\^'.\
 "ip\_address": "199.1.5.4" // the ip address of node 22\
 }\
 ]\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=5)

-   LEAVING\_NETWORK

{\
 "type": "LEAVING\_NETWORK", // a string\
 "node\_id": "42", // a non-negative number of order 2'\^32\^'
identifying the leaving node.\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=6)

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

-   INDEX

{\
 "type": "INDEX", //string\
 "node\_id": "34", //the target id\
 "keyword\_ID": "XXX", //the word being indexed\
 "link": "http:www.newindex.com" // the url the word is found in\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=7)

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

If a SEARCH message is received at a node, **all** results should be
retrieved from local storage and a SEARCH\_RESPONSE message should be
constructed and returned in the normal way.

-   SEARCH

{\
 "type": "SEARCH", // string\
 "word": "apple", // The word to search for\
 "node\_id": "34", // target node id\
 "sender\_id": "45" // id of requestor\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=8)

-   SEARCH\_RESPONSE

{\
 "type": "SEARCH\_RESPONSE",\
 "word": "word", // The word to search for\
 "node\_id": "45", // target node id\
 "response":\
 [\
 {\
 "www.dsg.cs.tcd.ie/", //url\
 32 //rank\
 },\
 {\
 "www.scss.tcd.ie/courses/mscnds/", //url\
 1 //rank\
 }\
 ]\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=9)

Message Acknowledgement.

Because the specification calls for UDP messaging, it is not possible to
identify whether messages are transferred from one node to the next
reliably. The following protocol, derived loosely from the bully
algorithm seeks to prompt nodes to update routing information via a PING
passed through the network following a failed transmission of another
message, testing and pruning the route.

For any (with the exception of SEARCH\_RESULT) message sent by a node
the receipt by the target should be acknowledged by an ACK message sent
in the normal way if there is no other message returned by the
recipient. These messages should received within 30 seconds by the
original node. If an ACK message, or alternative communication is not
received in that timeframe, the original node should attempt to send a
PING message to the same target, along the normal channel, and wait for
an ACK message. On receipt of a PING message, a node should send an ACK
message to the original sender of the PING message it received (so that
the sender maintains a route to recipient node), and should pass a PING
message on to the next node as appropriate. If the node is the final
target of the PING, it should cease processing.

If an expected ACK message is not received within 10 seconds the node
waiting should remove the node, to which it sent the PING message, from
the routing table.

-   PING

{\
 "type": "PING", // a string\
 "sender\_id": "23", // a non-negative number of order 2'\^32\^',
identifying the originator \
 // of the ping (does not change)\
 "node\_id": "23", // a non-negative number of order 2'\^32\^',
identifying the suspected dead node.\
 "ip\_address": "199.1.5.4" // the ip address of node sending the
message (changes each hop)\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=10)

-   ACK

{\
 "type": "ACK", // a string\
 "node\_id": "23", // a non-negative number of order 2'\^32\^',
identifying the suspected dead node.\
 "ip\_address": "199.1.5.4" // the ip address of sending node\
 }

[[$[Get
Code]]](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=sourceblock&num=11)

[Edit](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=edit)
-
[History](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=diff)
-
[Print](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official?action=print)
- [Recent
Changes](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.RecentChanges)
-
[Search](https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Site.Search)

Page last modified on November 26, 2013, at 05:29 PM
