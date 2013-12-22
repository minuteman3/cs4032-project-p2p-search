# CS4032 - Distributed Systems
## Distributed Search Project
### Miles McGuire - 07502192

* Main code resides in `lib/peernet.js`, with additional code in `lib/messages.js` and `lib/hashit.js`
* Implements the original specification for the assignment (pre-simplification)
* Modified so that multiple nodes can run on a single machine by binding to different ports. This necessitated adding port information to a variety of message types and storing ports in the routing table.

### Specification

The specification for this project is online (https://www.scss.tcd.ie/~ebarrett/Teaching/CS4032/wiki/index.php?n=Main.P2PWebSearchArchitectureSpecification-Official)[here]

A snapshot convereted to markdown format using Pandoc is included in this repository as `spec.md`

### Example

To see a running example, first launch `lib/example-gateway.js` to create a gateway node bound on port 12345 of localhost. Then run `lib/example-swarm.js` to connect a swarm of 6 nodes to that network. Finally run `lib/example-node.js` to create a node, which will trigger a series of timed actions to index some randomly generated words, then emit a search for those words and print the results to stdout, and every 10 seconds emit its state to show the updating of various internal fields such as the routing table.
