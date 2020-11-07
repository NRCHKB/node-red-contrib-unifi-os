import { NodeAPI } from 'node-red'
import LoginNodeType from '../types/LoginNodeType'
import LoginNodeConfigType from '../types/LoginNodeConfigType'
import axios, { AxiosResponse } from 'axios'

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
            const url =
                'https://' + self.config.controllerIp + '/api/auth/login'

            /*const post_data = JSON.stringify({
                username: self.config.username,
                password: self.config.pass,
            })

            // Request options
            const options = {
                method: 'POST',
                rejectUnauthorized: false,
                keepAlive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data),
                },
            }*/

            axios({
                method: 'post',
                url,
                data: {
                    username: self.config.username,
                    password: self.config.pass,
                },
            }).then((response: AxiosResponse) => {
                debug('Request sent')

                debug('Handling response')
                // Debug message with full response
                self.warn({
                    headers: response.headers,
                    payload: JSON.parse(response.data),
                    status: response.status,
                })
                self.warn({ setCookie: response.headers['set-cookie'] })
                self.status({
                    fill: 'green',
                    shape: 'dot',
                    text: 'connected',
                })
                // If successful - save the important cookies for use in other nodes
                if (response.status == 200) {
                    self.setCookie = response.headers['set-cookie']
                    self.warn(self.setCookie)
                    debug('Cookie received: ' + self.setCookie)
                } else {
                    self.status({
                        fill: 'red',
                        shape: 'ring',
                        text: 'connection failed',
                    })
                    self.warn(response.status)
                    debug('Cookie not received')
                }
            })
        })
    }

    // Register the unifiLogin node
    RED.nodes.registerType('unifi-login', unifiLogin)
}
