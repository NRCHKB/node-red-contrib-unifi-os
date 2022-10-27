import { logger } from '@nrchkb/logger'
import { isMatch } from 'lodash'
import { NodeAPI } from 'node-red'
import util from 'util'

import EventModels, { ThumbnailSupport, UnifiEventModel } from '../EventModels'
import { Interest } from '../SharedProtectWebSocket'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import ProtectNodeConfigType from '../types/ProtectNodeConfigType'
import ProtectNodeType from '../types/ProtectNodeType'

module.exports = (RED: NodeAPI) => {
    const reqRootPath = '/proxy/protect/api'
    const getReqPath = (Type: string, ID: string) => {
        return `${reqRootPath}/${Type}/${ID}`
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

        // Triger SS timer
        const DelaySnapshot = (EID: string) => {
            setTimeout(() => {
                getSnapshot(EID)
                    .then((D) => {
                        const UserPL = {
                            payload: {
                                associatedEventId: EID,
                                snapshotBuffer: D,
                            },
                        }
                        self.send([undefined, UserPL])
                    })
                    .catch((e) => {
                        console.error(e)
                    })
            }, parseInt(self.config.delayedSnapshotTime))
        }

        // Register our interest in Protect Updates.
        const handleUpdate = async (data: any) => {
            // Get ID
            const EID = data.action.id.split('-')[0]

            // Is End event?
            const isEnd =
                data.payload.end !== undefined &&
                data.action.action === 'update'

            if (isEnd) {
                // End of Event
                const SnapRequiremnets = ['InitialDelayed']
                const StartOfEvent = WaitingForEnd[EID]
                if (StartOfEvent !== undefined) {
                    const EndDate = data.payload.end
                    const Duration =
                        EndDate - StartOfEvent.payload.timestamps.startDate

                    const UserPL: any = {
                        payload: StartOfEvent.payload,
                    }

                    UserPL.payload.eventStatus = 'Stopped'
                    UserPL.payload.timestamps.endDate = EndDate
                    UserPL.payload.timestamps.duration = Duration

                    if (self.config.snapshotMode !== 'InitialRetain') {
                        delete UserPL.payload.snapshotBuffer
                    }

                    if (self.config.snapshotMode === 'None') {
                        UserPL.payload.snapshotAvailability = 'DISABLED'
                    }

                    if (SnapRequiremnets.includes(self.config.snapshotMode)) {
                        const TNS: ThumbnailSupport =
                            StartOfEvent.internal.identifiedEvent.metadata
                                .thumbnailSupport

                        switch (TNS) {
                            case ThumbnailSupport.NONE:
                                UserPL.payload.snapshotAvailability =
                                    'NOT_SUPPORTED'
                                break

                            case ThumbnailSupport.START_END:
                                try {
                                    UserPL.payload.snapshotBuffer =
                                        await getSnapshot(EID)
                                    UserPL.payload.snapshotAvailability =
                                        'INLINE'
                                } catch (e) {
                                    UserPL.payload.snapshotAvailability =
                                        'ERROR'
                                    console.error(e)
                                }
                                break
                            case ThumbnailSupport.START_WITH_DELAYED_END:
                                DelaySnapshot(EID)
                                UserPL.payload.snapshotAvailability = 'DELAYED'
                                break
                        }
                    }

                    if (data.payload.score !== undefined) {
                        UserPL.payload.score = data.payload.score
                    }

                    UserPL.payload.originalEventData = data
                    self.send([UserPL, undefined])
                    delete WaitingForEnd[EID]
                }
            } else {
                // New Event
                let IdentifiedEvent: UnifiEventModel | undefined
                let ShouldSkip = false
                const Now = new Date().getTime()
                const SnapRequiremnets = [
                    'InitialDelayed',
                    'Initial',
                    'InitialRetain',
                ]

                EventModels.forEach((EM) => {
                    if (ShouldSkip) {
                        return
                    }
                    if (isMatch(data, EM.shapeProfile)) {
                        IdentifiedEvent = EM
                        ShouldSkip = true
                    }
                })

                const Identified =
                    IdentifiedEvent &&
                    self.config.eventIds.includes(IdentifiedEvent.metadata.id)

                if (Identified) {
                    const Camera =
                        self.accessControllerNode.bootstrapObject!.cameras.filter(
                            (C: any) => C.id === self.config.cameraId
                        )[0]
                    const HasDuration = IdentifiedEvent!.metadata.hasDuration
                    const HasEvaluationValue =
                        IdentifiedEvent!.metadata.valueExpression

                    const UserPL: any = {
                        payload: {
                            cameraName: Camera.name,
                            cameraType: Camera.type,
                            cameraId: Camera.id,
                            event: IdentifiedEvent!.metadata.label,
                            eventId: EID,
                            hasDuration: HasDuration,
                        },
                    }

                    if (HasDuration) {
                        UserPL.payload.eventStatus = 'Started'
                        UserPL.payload.timestamps = {
                            startDate: data.payload.start,
                        }
                    } else {
                        UserPL.payload.timestamps = {
                            eventDate: data.payload.start || Now,
                        }
                    }

                    if (HasEvaluationValue) {
                        const EXP = RED.util.prepareJSONataExpression(
                            IdentifiedEvent!.metadata.valueExpression,
                            self
                        )
                        const Value = RED.util.evaluateJSONataExpression(
                            EXP,
                            data
                        )
                        UserPL.payload.value = Value
                    }

                    if (self.config.snapshotMode === 'None') {
                        UserPL.payload.snapshotAvailability = 'DISABLED'
                    }

                    if (SnapRequiremnets.includes(self.config.snapshotMode)) {
                        const TNS: ThumbnailSupport =
                            IdentifiedEvent!.metadata.thumbnailSupport

                        switch (TNS) {
                            case ThumbnailSupport.NONE:
                                UserPL.payload.snapshotAvailability =
                                    'NOT_SUPPORTED'
                                break

                            case ThumbnailSupport.SINGLE_DELAYED:
                                DelaySnapshot(EID)
                                UserPL.payload.snapshotAvailability = 'DELAYED'
                                break

                            case ThumbnailSupport.START_END:
                            case ThumbnailSupport.START_WITH_DELAYED_END:
                            case ThumbnailSupport.SINGLE:
                                try {
                                    UserPL.payload.snapshotBuffer =
                                        await getSnapshot(EID)
                                    UserPL.payload.snapshotAvailability =
                                        'INLINE'
                                } catch (e) {
                                    UserPL.payload.snapshotAvailability =
                                        'ERROR'
                                    console.error(e)
                                }
                                break
                        }
                    }

                    if (HasDuration) {
                        WaitingForEnd[EID] = RED.util.cloneMessage(UserPL)
                        WaitingForEnd[EID].internal = {
                            identifiedEvent: IdentifiedEvent,
                        }
                    }

                    UserPL.payload.originalEventData = data
                    self.send([UserPL, undefined])
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
