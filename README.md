# node-red-contrib-unifi-os

### What is this contrib? Why is it different?
This is an attempt to connect to UniFi OS websocket endpoints and pass all data (as JSON) from the UniFi OS into Node-RED for use in other flows.

Other node-red interfaces with UniFi controllers are compatible to the older 5.x controllers and are not focused on UniFi OS. This project is being built from the ground up to be designed for UniFi OS 1.8.x running UniFi Controller 6.x. 

This node devs are primarily running UDM Pro hardware. 
We will soon reach out to friends running UDM Base and Cloud Key networks.

### Current Status
The project is a work-in-progress. As of January 7, 2021 we have published an initial version available for testing. If you would like to help, please download and try it out! It should work with UDM Pro and UDM base models (as well as any other UniFi OS controllers). 
If you have questions, problems, or suggestions please open a topic [here](https://github.com/NRCHKB/node-red-contrib-unifi-os/discussions).
Thanks!

Current known working websocket endpoints:
- `/proxy/network/wss/s/default/events`
- `/api/ws/system`

Additionally, there is a `unifi-request` node which should be able to connect with HTTP GET to any of the GET endpoints [listed here](https://ubntwiki.com/products/software/UniFi-controller/api).

### Next Project Goals
The big goal of this project is to have push notifications from camera events (person detection, doorbell rings, motion alerts) into Node-RED flows.

Additional push notifications will include all of the UniFi data which can be found on your UniFi web interface, but in JSON for Node-RED!

Additionally, the node will have the ability to connect to any of the GET/POST/PUT endpoints [listed here](https://ubntwiki.com/products/software/UniFi-controller/api). These endpoints can be used to poll specific data from the controller or send commands to make changes to your UniFi network.
