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
    const debug = require('debug')('UNIFI:HTTP')
    const validateInputPayload = (payload) => {
        return payload === null || payload === void 0
            ? void 0
            : payload.endpoint
    }
    const unifiHTTP = function (config) {
        const self = this
        RED.nodes.createNode(self, config)
        self.config = config
        self.loginNode = RED.nodes.getNode(config.loginNodeId)
        if (!self.loginNode) {
            throw new Error('Login Node not found')
        }
        self.on('input', (msg) => {
            debug('Received input message: ' + JSON.stringify(msg))
            if (!self.loginNode.controllerIp) {
                throw new Error('Login Node controllerIp not set!')
            }
            if (!self.loginNode.setCookie) {
                throw new Error('Login Node setCookie not set!')
            }
            if (!validateInputPayload(msg.payload)) {
                throw new Error('Invalid payload')
            }
            const inputPayload = msg.payload
            const url =
                'https://' + self.loginNode.controllerIp + inputPayload.endpoint
            axios_1.default
                .request({
                    method: 'get',
                    url,
                    headers: {
                        cookie: self.loginNode.setCookie,
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false,
                    }),
                })
                .then((response) => {
                    if (response.status === 200) {
                        self.status({
                            fill: 'green',
                            shape: 'dot',
                            text: 'request successful',
                        })
                    } else {
                        self.status({
                            fill: 'red',
                            shape: 'ring',
                            text: 'request failed',
                        })
                    }
                })
                .catch((reason) => {
                    self.error(reason)
                })
        })
    }
    RED.nodes.registerType('unifi-HTTP', unifiHTTP)
}
