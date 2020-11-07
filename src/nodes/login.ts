import { NodeAPI } from 'node-red'
import LoginNodeType from '../types/LoginNodeType'
import LoginNodeConfigType from '../types/LoginNodeConfigType'
import * as https from 'https'
import * as http from 'http'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('UNIFI:login')

    const unifiLogin = function (
        this: LoginNodeType,
        config: LoginNodeConfigType
    ) {
        const self = this
        RED.nodes.createNode(self, config)
        self.config = config

        self.on('input', function (msg) {
            debug('Received message: ' + JSON.stringify(msg))

            // Build the HTTPS request for Unifi OS
            self.status({ fill: 'yellow', shape: 'dot', text: 'connecting' })
            const url = self.config.controllerIp + '/api/auth/login'
            const post_data = JSON.stringify({
                username: self.config.username,
                password: self.config.pass,
            })

            // Request options
            const options = {
                hostname: url,
                port: 443,
                method: 'POST',
                rejectUnauthorized: false,
                keepAlive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data),
                },
            }

            // Send login to Unifi, if successful, cookies will be returned in response
            const request = https.request(options, (response: http.IncomingMessage) => {
                debug("Request sent")

                response.on('data', function (body) {
                    debug("Handling response")
                    // Debug message with full response
                    self.warn({
                        headers: response.headers,
                        payload: JSON.parse(body),
                        status: response.statusCode,
                    })
                    self.warn({ setCookie: response.headers['set-cookie'] })
                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'connected',
                    })
                    // If successful - save the important cookies for use in other nodes
                    if (response.statusCode == 200) {
                        self.setCookie = response.headers['set-cookie']
                        self.warn(self.setCookie)
                        debug("Cookie received: " + self.setCookie)
                    } else {
                        self.status({
                            fill: 'red',
                            shape: 'ring',
                            text: 'connection failed',
                        })
                        self.warn(response.statusCode)
                        debug("Cookie not received")
                    }
                })
            })

            // Catch login errors
            request.on('error', function (e: Error) {
                self.warn(e)
            })

            // Include post data
            request.write(post_data)

            // Close request
            request.end()
        })
    }

    // Register the unifiLogin node
    RED.nodes.registerType('unifi-login', unifiLogin)
}
