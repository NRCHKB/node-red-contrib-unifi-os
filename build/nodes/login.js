"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = (RED) => {
    const https = require('https');
    const debug = require('debug')('UNIFI:login');
    const unifiLogin = function (config) {
        const self = this;
        RED.nodes.createNode(self, config);
        self.config = config;
        self.on('input', function (msg) {
            debug('Received message: ' + JSON.stringify(msg));
            self.status({ fill: 'yellow', shape: 'dot', text: 'connecting' });
            const url = 'https://' + self.config.controllerIp + '/api/auth/login';
            const post_data = JSON.stringify({
                username: self.config.username,
                password: self.config.pass,
            });
            const options = {
                method: 'POST',
                rejectUnauthorized: false,
                keepAlive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data),
                },
            };
            const request = https.request(url, options, function (response) {
                debug("Request sent");
                response.on('data', function (body) {
                    debug("Handling response");
                    self.warn({
                        headers: response.headers,
                        payload: JSON.parse(body),
                        status: response.statusCode,
                    });
                    self.warn({ setCookie: response.headers['set-cookie'] });
                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'connected',
                    });
                    if (response.statusCode == 200) {
                        self.setCookie = response.headers['set-cookie'];
                        self.warn(self.setCookie);
                        debug("Cookie received: " + self.setCookie);
                    }
                    else {
                        self.status({
                            fill: 'red',
                            shape: 'ring',
                            text: 'connection failed',
                        });
                        self.warn(response.statusCode);
                        debug("Cookie not received");
                    }
                });
            });
            request.on('error', function (e) {
                self.warn(e);
            });
            request.write(post_data);
            request.end();
        });
    };
    RED.nodes.registerType('unifi-login', unifiLogin);
};
