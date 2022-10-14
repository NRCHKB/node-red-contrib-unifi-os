import { NodeAPI } from 'node-red'
import ProtectNodeType from '../types/ProtectNodeType'
import ProtectNodeConfigType from '../types/ProtectNodeConfigType'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import { Interest } from '../SharedProtectWebSocket'
import { logger } from '@nrchkb/logger'
import util from 'util'
import EventModels, { UnifiEventModel } from '../EventModels'
import { isMatch } from 'lodash'

module.exports = (RED: NodeAPI) => {
    const ReqRootPath = '/proxy/protect/api'
    const getReqPath = (Type: string, ID: string) => {
        return `${ReqRootPath}/${Type}/${ID}`
    }

    const cloneObject = (data: any): any => {
        return JSON.parse(JSON.stringify(data))
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

        self.on('close', (done: () => void) => {
            self.accessControllerNode.protectSharedWS?.degisterInterest(self.id)
            done()
        })

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

        // Used to store the Start of an event with a duration.
        const WaitingForEnd: any = {}

        // Register our interest in Protect Updates.
        const handleUpdate = (data: any) => {
            // check if this is the end of an event
            if (
                data.action.action === 'update' &&
                data.payload.end !== undefined
            ) {
                // obtain start
                const StartOfEvent = WaitingForEnd[data.action.id]

                if (StartOfEvent) {
                    const UserPL: any = {
                        payload: {
                            camera: '',
                            cameraId: '',
                            event: StartOfEvent.payload.event,
                            eventId: data.action.id,
                            eventStatus: 'Stopped',
                            timestamps: {
                                start: StartOfEvent.payload.start,
                                end: data.payload.end,
                                duration:
                                    data.payload.end -
                                    StartOfEvent.payload.start,
                            },
                        },
                        originalEventData: data,
                    }
                    if (data.payload.score !== undefined) {
                        UserPL.payload.score = data.payload.score
                    }
                    self.send(UserPL)

                    delete WaitingForEnd[data.action.id]
                }
            } else {
                let IdentifiedEvent: UnifiEventModel | undefined

                EventModels.forEach((EM) => {
                    if (isMatch(data, EM.shapeProfile)) {
                        IdentifiedEvent = EM
                    }
                })

                if (
                    IdentifiedEvent &&
                    self.config.eventIds.includes(IdentifiedEvent.metadata.id)
                ) {
                    const UserPL: any = {
                        payload: {
                            camera: '',
                            cameraId: '',
                            event: IdentifiedEvent?.metadata.label,
                            eventId: data.action.id,
                            eventStatus: IdentifiedEvent?.metadata.hasDuration
                                ? 'Started'
                                : 'SingleEvent',
                            timestamps: {
                                start: data.payload.start,
                            },
                        },
                        originalEventData: data,
                    }
                    self.send(UserPL)
                    if (IdentifiedEvent.metadata.hasDuration) {
                        WaitingForEnd[data.action.id] = cloneObject(UserPL)
                    }
                }
            }
        }

        const I: Interest = {
            deviceId: this.config.cameraId,
            callback: handleUpdate,
        }
        self.accessControllerNode.protectSharedWS?.registerInterest(self.id, I)

        log.debug('Initialized')
    }

    // Register the Protect Node
    RED.nodes.registerType('unifi-protect', init)

    logger('UniFi', 'Protect').debug('Type registered')
}
