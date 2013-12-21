# CS4032 - Distributed Systems
## Distributed Search Project
### Miles McGuire - 07502192

* Main code resides in `lib/peernet.js`, with additional code in `lib/messages.js` and `lib/hashit.js`
* Implements the original specification for the assignment (pre-simplification)
* Modified so that multiple nodes can run on a single machine by binding to different ports. This necessitated adding port information to a variety of message types and storing ports in the routing table.
