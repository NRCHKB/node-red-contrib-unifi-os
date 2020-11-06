# node-red-contrib-unifi-os
Unifi OS nodes with websocket connections

October 11, 2020\
Work in progress. Goal is to create a set of nodered nodes which will connect to Unifi OS controller and protect websockets to push information from Unifi OS into nodered. 

## Project Goals and Outline (November 3, 2020)

The goal of this contrib is to log into Unifi OS (UDM or UDM Pro) and provide websocket nodes which output JSON into the NodeRED environment. It will additionally facilitate HTTP GET and POST commands which are documented [here](https://ubntwiki.com/products/software/unifi-controller/api)

The following nodes will be included:
- Config node for keeping authentication and holding authentication cookies
- Websocket connection node to all known endpoints
- HTTP GET and POST node which will use the current cookies to poll HTTP endpoints or send HTTP commands on input


Known websocket endpoints at this point, please open an issue or PR if you know of others:
- Events (wifi connects/disconnects) `/proxy/network/wss/s/default/events`
- Unifi Protect (cameras) `/proxy/protect/ws/updates` (requires query after URL)
- System (system events and equipment stats) `/api/ws/system`

Dependncies, try to have as few as possible
- https
- ws

