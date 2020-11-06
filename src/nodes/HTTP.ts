import { NodeAPI } from 'node-red'
import HttpNodeConfigType from '../types/HttpNodeConfigType'
import HttpNodeType from '../types/HttpNodeType'
import LoginNodeType from '../types/LoginNodeType'
import {IncomingMessage} from 'http'
import LoginNodeInputPayloadType from '../types/LoginNodeInputPayloadType'

module.exports = (RED: NodeAPI) => {
    const https = require('https')
    const debug = require('debug')('UNIFI:HTTP')

    const validateInputPayload = (payload: any): boolean => {
        if (!payload?.endpoint) {
            return false
        }

        return true
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
            throw new Error("Login Node not found")
        }

        self.on('input', (msg) => {
            debug('Received message: ' + JSON.stringify(msg))

            if (!validateInputPayload(msg.payload)) {
                throw new Error("Invalid payload")
            }

            const inputPayload = msg.payload as LoginNodeInputPayloadType

            const url = 'https://' + self.loginNode.controllerIp + inputPayload.endpoint

            // Request options
            const options = {
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    cookie: self.loginNode.setCookie,
                },
            }

            const request = https.request(url, options, (response: IncomingMessage) => {
                response.on('data', (body: any) => {
                    // Debug message with full response
                    self.warn({
                        headers: response.headers,
                        payload: JSON.parse(body),
                        status: response.statusCode,
                    })
                    debug()

                    if (response.statusCode == 200) {
                        // Do something if successful request
                    } else {
                        // Do something if request fails
                        self.warn(response.statusCode)
                    }
                })
            })

            // Catch login errors
            request.on('error', (e: Error) => {
                self.warn(e)
            })

            // Include post data
            // request.write(post_data);

            // Close request
            request.end()
        })
    }

    // Register the requestHTTP node
    RED.nodes.registerType('unifi-HTTP', unifiHTTP)
}
