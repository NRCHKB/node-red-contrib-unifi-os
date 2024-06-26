import { logger } from '@nrchkb/logger'
import { NodeAPI } from 'node-red'
import util from 'util'
import { unzip } from 'zlib'

import AccessControllerNodeType from '../types/AccessControllerNodeType'
import RequestNodeConfigType from '../types/RequestNodeConfigType'
import RequestNodeInputPayloadType from '../types/RequestNodeInputPayloadType'
import RequestNodeType from '../types/RequestNodeType'
import { UnifiResponse } from '../types/UnifiResponse'

module.exports = (RED: NodeAPI) => {
    const validateInputPayload = (
        self: RequestNodeType,
        payload: any
    ): RequestNodeInputPayloadType => {
        if (!self.config?.endpoint && !payload?.endpoint) {
            self.status({
                fill: 'red',
                shape: 'dot',
                text: 'Missing endpoint',
            })

            throw new Error('Missing endpoint in either payload or node config')
        }

        return payload
    }

    const init = function (
        this: RequestNodeType,
        config: RequestNodeConfigType
    ) {
        const self = this
        RED.nodes.createNode(self, config)
        self.config = config

        self.accessControllerNode = RED.nodes.getNode(
            self.config.accessControllerNodeId
        ) as AccessControllerNodeType

        if (!self.accessControllerNode) {
            self.status({
                fill: 'red',
                shape: 'dot',
                text: 'Access Controller not found',
            })
            return
        }

        self.name =
            self.config.name || self.accessControllerNode.name + ':' + self.id

        new Promise((resolve) => {
            const checkAndWait = () => {
                if (self.accessControllerNode.initialized) {
                    resolve(true)
                } else {
                    self.status({
                        fill: 'yellow',
                        shape: 'dot',
                        text: 'Initializing...',
                    })

                    setTimeout(checkAndWait, 1500)
                }
            }

            checkAndWait()
        }).then(() => {
            body.call(self)
        })
    }

    const body = function (this: RequestNodeType) {
        const self = this
        const log = logger('UniFi', 'Request', self.name, self)

        self.on('input', (msg) => {
            log.debug('Received input message: ' + util.inspect(msg))

            self.status({
                fill: 'grey',
                shape: 'dot',
                text: 'Sending',
            })

            const inputPayload = validateInputPayload(self, msg.payload)

            const endpoint = inputPayload?.endpoint || self.config.endpoint
            const method = inputPayload?.method || self.config.method || 'GET'
            const responseType =
                inputPayload?.responseType || self.config.responseType || 'json'

            let data = undefined
            if (method != 'GET') {
                data = inputPayload?.data || self.config.data
            }

            self.accessControllerNode
                .request(self.id, endpoint, method, data, responseType)
                .then((data) => {
                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'Sent',
                    })
                    log.debug('Result:')
                    log.trace(util.inspect(data))

                    console.log(typeof data)

                    const _send = (Result: UnifiResponse) => {
                        self.send({
                            payload: Result,
                            inputMsg: msg,
                        })
                    }

                    if (Buffer.isBuffer(data)) {
                        unzip(data, (_err, result) => {
                            _send(
                                JSON.parse(result.toString()) as UnifiResponse
                            )
                        })
                    } else {
                        _send(data)
                    }
                })
                .catch((error) => {
                    log.error(error)

                    self.status({
                        fill: 'red',
                        shape: 'dot',
                        text: error.message,
                    })
                })
        })

        self.status({
            fill: 'green',
            shape: 'dot',
            text: 'Initialized',
        })

        log.debug('Initialized')
    }

    // Register the requestHTTP node
    RED.nodes.registerType('unifi-request', init)

    logger('UniFi', 'Request').debug('Type registered')
}
