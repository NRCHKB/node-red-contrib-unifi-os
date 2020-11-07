import { NodeAPI } from 'node-red'
import LoginNodeType from '../types/LoginNodeType'
import LoginNodeConfigType from '../types/LoginNodeConfigType'
import Axios, { AxiosResponse } from 'axios'
import * as https from 'https'

module.exports = (RED: NodeAPI) => {
    const debug = require('debug')('UNIFI:login')

    const unifiLogin = function (
        this: LoginNodeType,
        config: LoginNodeConfigType
    ) {
        const self = this
        RED.nodes.createNode(self, config)
        self.config = config
        self.name = self.config.name

        self.status({ fill: 'yellow', shape: 'dot', text: 'connecting' })
        const url = 'https://' + self.config.controllerIp + '/api/auth/login'

        Axios.request({
            method: 'post',
            url,
            data: {
                username: self.config.username,
                password: self.config.pass,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        })
            .then((response: AxiosResponse) => {
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
            .catch((reason: any) => {
                self.error(reason)
            })
    }

    RED.nodes.registerType('unifi-login', unifiLogin)
}
