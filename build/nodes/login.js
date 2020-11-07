"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const https = __importStar(require("https"));
module.exports = (RED) => {
    const debug = require('debug')('UNIFI:login');
    const unifiLogin = function (config) {
        const self = this;
        RED.nodes.createNode(self, config);
        self.config = config;
        try {
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
                const handleResponse = function (response) {
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
                };
                const request = https.request(url, options, handleResponse);
                request.on('error', function (e) {
                    self.warn(e);
                });
                request.write(post_data);
                request.end();
            });
        }
        catch (error) {
            debug(error);
        }
    };
    RED.nodes.registerType('unifi-login', unifiLogin);
};
