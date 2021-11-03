# node-red-contrib-unifi-os

<img width="770" alt="image" src="https://user-images.githubusercontent.com/38265886/125874556-df4a9d8e-11da-4a18-a11a-c12717afe11e.png">

### * What is this contrib? Why is it different?
This project will give access to all known UniFi http and websocket API endpoints. It is specifically focused on **UniFI OS** consoles, it is not expected to work with older UniFi hardware. The data (tons of it) is passed into Node-RED as JSON data from the HTTP request and WebSocket connection nodes. The internals assist with login cookies and credentials handling. All data from the API is sent on to the user.

Be warned, it is a lot of data. It will be up to the user to build filters and find the JSON data they are looking for.

### * Current Status
Updated July 15, 2021.

Currently we have what appears to be a fully functioning setup. We are still looking for errors and bugs from more edge case testing, please report if you find something.

The HTTP endpoints [listed here](https://ubntwiki.com/products/software/UniFi-controller/api) should all be working properly. GET, POST, and PUT requests should all be functioning and able to pass commands from Node-RED into the UniFi API.

The WebSocket endpoints are fully functional as well, including push updates from UniFi OS, the Network app, and the Protect app. We have not tested Talk or Access apps - simply because none of us have that hardware, should work fine though.

### * Initial Setup

It is recommended that you create a local admin on your UniFi OS console. This will enable simple login (not 2FA) and allow a local connection between your Node-RED instance and your UniFi console. In order to add a local user, simply go to your UniFi console's user management screen and add a new user, selecting "Local Access" under Account Type.

As you place your first UniFi node, you will need to create a new config node. This is where you will put your UniFi Console IP address, username, and password. No further work is required to log into your console.

### * How to Use HTTP Request Node

HTTP request nodes can do all of the things [listed here](https://ubntwiki.com/products/software/UniFi-controller/api). 

The configuration may be set either by typing into the node's setup fields or by sending payloads including `msg.payload.endpoint`, `msg.payload.method`, and `msg.payload.data`.

The format of these nodes is a bit different from the list linked above. Here is a very incomplete list of tested endpoints to get started with:
```
/proxy/network/api/s/default/stat/health
/proxy/protect/api/bootstrap
/proxy/protect/api/cameras
/proxy/network/api/s/default/stat/sta/
/proxy/network/api/s/default/cmd/stat
```

Here is an example payload which maybe sent if you would like to send data (POST) to the UniFi Console. This example will reset the DPI counters on your system. **DATA WILL BE REMOVED FROM YOUR UNIFI CONSOLE WHEN SENDING THIS MESSAGE**
```json
{
  "payload": {
    "endpoint": "/proxy/network/api/s/default/cmd/stat",
    "method": "POST",
    "data": {"cmd":"reset-dpi"}
  }
}
```

Please use [this excellent list](https://ubntwiki.com/products/software/UniFi-controller/api) to learn all of the fun things you might like to send to the HTTP node.

### * How to Use WebSocket Node

The UniFi Consoles are *very talkative*. The websocket nodes are easy to set up, simply put the endpoint into the setup field and deploy. Then watch the data flow.

Here is a short list of known WebSocket endpoints, please create an issue or share on Discord if you know of more
```
/proxy/network/wss/s/default/events
/api/ws/system
/proxy/protect/ws/updates?[QUERY-STRING]
```

That last one is special. It needs a query string from the bootstrap HTTP endpoint. But it's also the most important part of this node. When set up properly it will provide real-time UniFi Protect data into your Node-RED flows. This includes motion detection, doorbell buttons, and smart detections. See the following section for more about this setup.

### * Real-Time UniFi Protect API Connection

This connection is a two-part setup.

- Step 1: obtain a `bootstrap` payload from the HTTP node. This will come from the endpoint `/proxy/protect/api/bootstrap`. The response from `bootstrap` should have a part called `msg.payload.lastUpdateId` - that is what you will need for the next piece.
- Step 2: connect to a WebSocket endpoint using the `lastUpdateId` obtained in (Step 1) `/proxy/protect/ws/updates?lastUpdateId=${msg.payload.lastUpdateId}`. This websocket will pump out live unifi protect payloads.

Here is a screenshot of how this looks in practice:
<img width="962" alt="image" src="https://user-images.githubusercontent.com/38265886/125873952-4b956296-f4fb-4547-ac62-ab382ae21da9.png">

The function node is quite simple, it looks like this inside:
```js
if ("lastUpdateId" in msg.payload) {
    return {
        payload: {
            endpoint: `/proxy/protect/ws/updates?lastUpdateId=${msg.payload.lastUpdateId}`
        }
    };
}
```

Re-authentication *may* be needed after some time. The second output on your WebSocket node will provide any errors due to this connection. Readme will be updated soon (soon after July 15, 2021) with some options for using these errors in re-connect.

### Problems, Testing, and Development

If you have questions, problems, or suggestions please open a topic [here](https://github.com/NRCHKB/node-red-contrib-unifi-os/discussions). Note this is a very new node with limited testing. Please, please open an issue or discussion if you find any problems.
Thanks!

Additionally, please find us at the `#unifi` channel at our [Discord server](https://discord.gg/RCH3g22YCg)
