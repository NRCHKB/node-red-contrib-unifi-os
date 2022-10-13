import { NodeAPI } from 'node-red'
import ProtectNodeType from '../types/ProtectNodeType'
import ProtectNodeConfigType from '../types/ProtectNodeConfigType'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import { Interest } from './SharedProtectWebSocket'
import { logger } from '@nrchkb/logger'
import util from 'util'

module.exports = (RED: NodeAPI) => {
    const ReqRootPath = '/proxy/protect/api'
    const getReqPath = (Type: string, ID: string) => {
        return `${ReqRootPath}/${Type}/${ID}`
    }

    interface Eventdef {
        action?: string
        type?: string
        label?: string
        smartDetectTypes?: string
        selectValue?: string
        hasEnd?: boolean
    }

    // The event Map
    const EventMaps: Eventdef[] = [
        {
            action: 'add',
            type: 'motion',
            label: 'Motion Detected',
            selectValue: 'motion',
            hasEnd: true,
        },
        {
            action: 'add',
            type: 'ring',
            label: 'Door Bell Ring',
            selectValue: 'bell',
            hasEnd: false,
        },
        {
            action: 'add',
            type: 'smartDetectZone',
            smartDetectTypes: 'vehicle',
            label: 'Vehicle Detected',
            selectValue: 'vehicle',
            hasEnd: true,
        },
        {
            action: 'add',
            type: 'smartDetectZone',
            smartDetectTypes: 'package',
            label: 'Package Detected',
            selectValue: 'package',
            hasEnd: false,
        },
        {
            action: 'add',
            type: 'smartDetectZone',
            smartDetectTypes: 'person',
            label: 'Person Detected',
            selectValue: 'person',
            hasEnd: true,
        },
    ]

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

                if (StartOfEvent !== undefined) {
                    const UserPL = {
                        payload: {
                            event: StartOfEvent.payload.event,
                            id: data.action.id,
                            durationType: 'EndOfEvent',
                            date: data.payload.end,
                        },
                        originalEventData: data,
                    }
                    self.send(UserPL)

                    delete WaitingForEnd[data.action.id]
                }
            } else {
                let IdentifiedEvent: Eventdef = {}
                const MatchedEvents = EventMaps.filter(
                    (M) =>
                        M.action === data.action.action &&
                        M.type === data.payload.type
                )

                if (MatchedEvents.length > 0) {
                    if (
                        data.payload.smartDetectTypes !== undefined &&
                        data.payload.smartDetectTypes.length > 0
                    ) {
                        IdentifiedEvent = MatchedEvents.filter(
                            (M) =>
                                M.smartDetectTypes ===
                                data.payload.smartDetectTypes[0]
                        )[0]
                    } else {
                        IdentifiedEvent = MatchedEvents[0]
                    }

                    const UserPL = {
                        payload: {
                            HT:WaitingForEnd,
                            event: IdentifiedEvent?.label,
                            id: data.action.id,
                            durationType: IdentifiedEvent?.hasEnd
                                ? 'StartOfEvent'
                                : 'SingleEvent',
                            date: data.payload.start,
                        },
                        originalEventData: data,
                    }
                    self.send(UserPL)

                    if (IdentifiedEvent.hasEnd) {
                        WaitingForEnd[data.action.id] = JSON.parse(JSON.stringify(UserPL))
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
