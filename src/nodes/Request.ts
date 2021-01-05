import { NodeAPI } from 'node-red'
import RequestNodeConfigType from '../types/RequestNodeConfigType'
import RequestNodeType from '../types/RequestNodeType'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import AccessControllerNodeInputPayloadType from '../types/AccessControllerNodeInputPayloadType'
import { logger } from '../logger'

module.exports = (RED: NodeAPI) => {
    const validateInputPayload = <T>(
        self: RequestNodeType,
        payload: any
    ): T => {
        if (!payload?.endpoint) {
            self.status({
                fill: 'red',
                shape: 'dot',
                text: 'Missing endpoint',
            })

            throw new Error('Invalid payload, missing endpoint')
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
        const [logDebug, logError] = logger(self.name, 'HTTP')

        self.on('input', (msg) => {
            logDebug('Received input message: ' + JSON.stringify(msg))

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
                .get(inputPayload.endpoint)
                .then((data) => {
                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'Sent',
                    })

                    logDebug('Result: ' + JSON.stringify(data))
                    self.send({
                        payload: data,
                    })
                })
                .catch((error) => {
                    logError(error)

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

        logDebug('initialized')
    }

    // Register the requestHTTP node
    RED.nodes.registerType('unifi-request', init)
}
