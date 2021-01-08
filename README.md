# node-red-contrib-unifi-os

### What is this contrib? Why is it different?
This is an attempt to connect to Unifi OS websocket endpoints and pass all data (as JSON) from the Unifi OS into Node-RED for use in other flows.

Other node-red interfaces with Unifi controllers are compatible the older 5.x controllers and are not focused on Unifi OS. This project is being built from the ground up to be designed for Unifi OS 1.8.x running Unifi Controller 6.x. The the devs are running UDM Pro hardware, we will soon reach out to friends running UDM Base and Cloud Key networks.

### Current Status
The project is a work-in-progress. As of January 7, 2021 we have published an initial version available for testing. If you would like to help, please download and try it out! It should work with UDM Pro and UDM base models (as well as any other Unifi OS controllers). If you have questions, problems, or suggestions please open an issue! Thanks!

Current known working websocket endpoints:
- `/proxy/network/wss/s/default/events`
- `/api/ws/system`

Additionally there is a `unifi-get-requestor` node which should be able to connect with HTTP GET to any of the GET endpoints [listed here](https://ubntwiki.com/products/software/unifi-controller/api).

### Next Project Goals
The big goal of this project is to have push notifications from camera events (person detection, doorbell rings, motion alerts) into Node-RED flows.

Additional push notifications will include all of the Unifi data which can be found on your Unifi web interface, but in JSON for Node-RED!

Additionally the node will have the ability to connect to any of the GET/POST/PUT endpoints [listed here](https://ubntwiki.com/products/software/unifi-controller/api). These endpoints can be used to poll specific data from the controller or send commands to make changes to your Unifi network.
