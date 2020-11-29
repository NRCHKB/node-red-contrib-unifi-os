'use strict'
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k]
                  },
              })
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k
              o[k2] = m[k]
          })
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, 'default', {
                  enumerable: true,
                  value: v,
              })
          }
        : function (o, v) {
              o['default'] = v
          })
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod
        var result = {}
        if (mod != null)
            for (var k in mod)
                if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                )
                    __createBinding(result, mod, k)
        __setModuleDefault(result, mod)
        return result
    }
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
const axios_1 = __importDefault(require('axios'))
const https = __importStar(require('https'))
module.exports = (RED) => {
    const debug = require('debug')('UNIFI:login')
    const unifiLogin = function (config) {
        const self = this
        RED.nodes.createNode(self, config)
        self.config = config
        self.name = self.config.name
        self.status({ fill: 'yellow', shape: 'dot', text: 'connecting' })
        const url = 'https://' + self.config.controllerIp + '/api/auth/login'
        axios_1.default
            .request({
                method: 'post',
                url,
                data: {
                    username: self.credentials.username,
                    password: self.credentials.password,
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false,
                }),
            })
            .then((response) => {
                if (response.status === 200) {
                    self.setCookie = response.headers['set-cookie']
                    debug('Cookie received: ' + self.setCookie)
                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'connected',
                    })
                } else {
                    self.status({
                        fill: 'red',
                        shape: 'ring',
                        text: 'connection failed',
                    })
                }
            })
            .catch((reason) => {
                self.error(reason)
            })
    }
    RED.nodes.registerType('unifi-login', unifiLogin, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
        },
    })
}
