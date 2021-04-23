import { NodeAPI } from 'node-red'
import RequestNodeConfigType from '../types/RequestNodeConfigType'
import RequestNodeType from '../types/RequestNodeType'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import AccessControllerNodeInputPayloadType from '../types/AccessControllerNodeInputPayloadType'
import { logger } from '@nrchkb/logger'
import util from 'util'

module.exports = (RED: NodeAPI) => {
    const validateInputPayload = <T>(
        self: RequestNodeType,
        payload: any
    ): T => {
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

            const inputPayload = validateInputPayload<AccessControllerNodeInputPayloadType>(
                self,
                msg.payload
            )

            self.accessControllerNode
                .request(
                    self.id,
                    inputPayload?.endpoint || self.config.endpoint,
                    inputPayload?.method || self.config.method || 'GET',
                    inputPayload?.data || self.config.data
                )
                .then((data) => {
                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'Sent',
                    })
                    log.debug('Result:')
                    log.trace(util.inspect(data))
                    self.send({
                        payload: data,
                        inputMsg: msg,
                    })
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
