import { NodeAPI } from 'node-red'
import HttpNodeConfigType from '../types/HttpNodeConfigType'
import HttpNodeType from '../types/HttpNodeType'
import LoginNodeType from '../types/LoginNodeType'
import LoginNodeInputPayloadType from '../types/LoginNodeInputPayloadType'
import Axios, { AxiosResponse } from 'axios'
import * as https from 'https'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('UNIFI:HTTP')

    const validateInputPayload = (payload: any): boolean => {
        return payload?.endpoint
    }

    const unifiHTTP = function (
        this: HttpNodeType,
        config: HttpNodeConfigType
    ) {
        const self = this
        RED.nodes.createNode(self, config)
        self.config = config

        // Initialize login node relation
        self.loginNode = RED.nodes.getNode(config.loginNodeId) as LoginNodeType

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

            const inputPayload = msg.payload as LoginNodeInputPayloadType

            const url =
                'https://' + self.loginNode.controllerIp + inputPayload.endpoint

            Axios.request({
                method: 'get',
                url,
                headers: {
                    cookie: self.loginNode.setCookie,
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false,
                }),
            })
                .then((response: AxiosResponse) => {
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
                .catch((reason: any) => {
                    self.error(reason)
                })
        })
    }

    // Register the requestHTTP node
    RED.nodes.registerType('unifi-HTTP', unifiHTTP)
}
