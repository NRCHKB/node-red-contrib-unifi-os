"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = (RED) => {
    const https = require('https');
    const debug = require('debug')('UNIFI:HTTP');
    const validateInputPayload = (payload) => {
        if (!(payload === null || payload === void 0 ? void 0 : payload.endpoint)) {
            return false;
        }
        return true;
    };
    const unifiHTTP = function (config) {
        const self = this;
        RED.nodes.createNode(self, config);
        self.config = config;
        self.loginNode = RED.nodes.getNode(config.loginNodeId);
        if (!self.loginNode) {
            throw new Error("Login Node not found");
        }
        self.on('input', function (msg) {
            debug('Received message: ' + JSON.stringify(msg));
            if (!validateInputPayload(msg.payload)) {
                throw new Error("Invalid payload");
            }
            const inputPayload = msg.payload;
            const url = 'https://' + self.loginNode.controllerIp + inputPayload.endpoint;
            const options = {
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    cookie: self.loginNode.setCookie,
                },
            };
            const request = https.request(url, options, function (response) {
                response.on('data', function (body) {
                    self.warn({
                        headers: response.headers,
                        payload: JSON.parse(body),
                        status: response.statusCode,
                    });
                    debug();
                    if (response.statusCode == 200) {
                    }
                    else {
                        self.warn(response.statusCode);
                    }
                });
            });
            request.on('error', function (e) {
                self.warn(e);
            });
            request.end();
        });
    };
    RED.nodes.registerType('unifi-HTTP', unifiHTTP);
};
