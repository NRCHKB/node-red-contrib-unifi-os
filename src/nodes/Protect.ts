import { NodeAPI } from 'node-red'
import ProtectNodeType from '../types/ProtectNodeType'
import ProtectNodeConfigType from '../types/ProtectNodeConfigType'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import { logger } from '@nrchkb/logger'
import util from 'util'

module.exports = (RED: NodeAPI) => {
    const ReqRootPath = '/proxy/protect/api'
    const getReqPath = (Type: string, ID: string) => {
        return `${ReqRootPath}/${Type}/${ID}`
    }

    const init = function (
        this: ProtectNodeType,
        config: ProtectNodeConfigType
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

    const body = function (this: ProtectNodeType) {
        const self = this
        const log = logger('UniFi', 'Protect', self.name, self)

        self.on('input', (msg) => {
            log.debug('Received input message: ' + util.inspect(msg))
            const Path = getReqPath('cameras', self.config.cameraId)

            self.status({
                fill: 'grey',
                shape: 'dot',
                text: 'Sending',
            })

            self.accessControllerNode
                .request(self.id, Path, 'PATCH', msg.payload, 'json')
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

    // Register the Protect Node
    RED.nodes.registerType('unifi-protect', init)

    logger('UniFi', 'Protect').debug('Type registered')
}
