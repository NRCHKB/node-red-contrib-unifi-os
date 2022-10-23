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

        // Get Snapshot
        const getSnapshot = (eventId: string): Promise<any | undefined> => {
            return new Promise((resolve, reject) => {
                const URI = `/proxy/protect/api/events/${eventId}/thumbnail?h=${self.config.snapshotH}&w=${self.config.snapshotW}`
                self.accessControllerNode
                    .request(self.id, URI, 'GET', undefined, 'arraybuffer')
                    .then((D) => {
                        resolve(D)
                    })
                    .catch((e) => {
                        reject(e)
                    })
            })
        }

        // Register our interest in Protect Updates.
        const handleUpdate = async (data: any) => {
            // check if this is the end of an event
            if (
                data.action.action === 'update' &&
                data.payload.end !== undefined
            ) {
                // Get ID
                const EID = data.action.id.split('-')[0]

                // obtain start
                const StartOfEvent = WaitingForEnd[EID]

                if (StartOfEvent) {
                    const End = data.payload.end
                    const UserPL: any = {
                        payload: StartOfEvent.payload,
                    }
                    UserPL.payload.eventStatus = 'Stopped'
                    UserPL.payload.timestamps.endDate = End
                    UserPL.payload.timestamps.duration =
                        End - UserPL.payload.timestamps.startDate

                    if (
                        self.config.includeSnapshot &&
                        UserPL.payload.snapshotBuffer !== undefined
                    ) {
                        try {
                            /* odd issue - returns 404 but its fine in the browser */
                            /*
                            UserPL.payload.snapshotBuffer = await getSnapshot(
                                EID
                            )
                            */
                            /*
                            23 Oct 10:15:22 - [error] [unifi-protect:My UDR:e65dcb18c5cbabc1] Bad response from: https://10.0.0.1/proxy/protect/api/events/6355061a03e7ab03e7002a99/thumbnail?h=128&w=128
                            23 Oct 10:15:22 UniFi-Error [My UDR:e65dcb18c5cbabc1:e65dcb18c5cbabc1] Bad response from: https://10.0.0.1/proxy/protect/api/events/6355061a03e7ab03e7002a99/thumbnail?h=128&w=128 +0ms
                            23 Oct 10:15:22 - [error] [unifi-protect:My UDR:e65dcb18c5cbabc1] Endpoint not found: Error: Request failed with status code 404
                            23 Oct 10:15:22 UniFi-Error [My UDR:e65dcb18c5cbabc1:e65dcb18c5cbabc1] Endpoint not found: Error: Request failed with status code 404 +32ms
                            */
                        } catch (e) {
                            console.error(e)
                        }

                        if (data.payload.score !== undefined) {
                            UserPL.payload.score = data.payload.score
                        }
                    }

                    UserPL.payload.originalEventData = data
                    self.send(UserPL)
                    delete WaitingForEnd[EID]
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
                    const Camera =
                        self.accessControllerNode.bootstrapObject.cameras.filter(
                            (C: any) => C.id === self.config.cameraId
                        )[0]

                    // Get ID
                    const EID = data.action.id.split('-')[0]

                    const UserPL: any = {
                        payload: {
                            cameraName: Camera.name,
                            cameraType: Camera.type,
                            cameraId: Camera.id,
                            event: IdentifiedEvent?.metadata.label,
                            eventId: EID,
                            hasDuration: IdentifiedEvent?.metadata.hasDuration,
                        },
                    }

                    if (IdentifiedEvent?.metadata.hasDuration) {
                        UserPL.payload.eventStatus = 'Started'
                        UserPL.payload.timestamps = {
                            startDate: data.payload.start,
                        }
                    } else {
                        UserPL.payload.timestamps = {
                            eventDate:
                                data.payload.start || new Date().getTime(),
                        }
                    }

                    if (IdentifiedEvent.metadata.valueExpression) {
                        const EXP = RED.util.prepareJSONataExpression(
                            IdentifiedEvent.metadata.valueExpression,
                            self
                        )
                        const Value = RED.util.evaluateJSONataExpression(
                            EXP,
                            data
                        )
                        UserPL.payload.value = Value
                    }

                    if (
                        self.config.includeSnapshot &&
                        IdentifiedEvent.metadata.supportsSnapshot
                    ) {
                        try {
                            UserPL.payload.snapshotBuffer = await getSnapshot(
                                EID
                            )
                        } catch (e) {
                            console.error(e)
                        }
                    }

                    if (IdentifiedEvent.metadata.hasDuration) {
                        WaitingForEnd[EID] = RED.util.cloneMessage(UserPL)
                    }

                    UserPL.payload.originalEventData = data
                    self.send(UserPL)
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
