"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
module.exports = (RED) => {
    const debug = require('debug')('UNIFI:login');
    const unifiLogin = function (config) {
        const self = this;
        RED.nodes.createNode(self, config);
        self.config = config;
        self.on('input', function (msg) {
            debug('Received message: ' + JSON.stringify(msg));
            self.status({ fill: 'yellow', shape: 'dot', text: 'connecting' });
            const url = 'https://' + self.config.controllerIp + '/api/auth/login';
            axios_1.default({
                method: 'post',
                url,
                data: {
                    username: self.config.username,
                    password: self.config.pass,
                },
            }).then((response) => {
                debug('Request sent');
                debug('Handling response');
                self.warn({
                    headers: response.headers,
                    payload: JSON.parse(response.data),
                    status: response.status,
                });
                self.warn({ setCookie: response.headers['set-cookie'] });
                self.status({
                    fill: 'green',
                    shape: 'dot',
                    text: 'connected',
                });
                if (response.status == 200) {
                    self.setCookie = response.headers['set-cookie'];
                    self.warn(self.setCookie);
                    debug('Cookie received: ' + self.setCookie);
                }
                else {
                    self.status({
                        fill: 'red',
                        shape: 'ring',
                        text: 'connection failed',
                    });
                    self.warn(response.status);
                    debug('Cookie not received');
                }
            });
        });
    };
    RED.nodes.registerType('unifi-login', unifiLogin);
};
