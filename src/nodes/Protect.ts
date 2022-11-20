import { logger } from '@nrchkb/logger'
import { isMatch } from 'lodash'
import { NodeAPI } from 'node-red'
import util from 'util'

import EventModels, { ThumbnailSupport } from '../EventModels'
import { Interest } from '../SharedProtectWebSocket'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import ProtectNodeConfigType from '../types/ProtectNodeConfigType'
import ProtectNodeType from '../types/ProtectNodeType'

const initialSnapshotModeRequirements = [
    'InitialDelayed',
    'Initial',
    'InitialRetain',
]
const endSnapshotModeRequirements = ['InitialDelayed']

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

        // Used to store the Start of an event with a duration.
        const startEvents: any = {}

        self.on('close', (done: () => void) => {
            self.accessControllerNode.protectSharedWS?.deregisterInterest(
                self.id
            )
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
            }, self.config.delayedSnapshotTime)
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

                const StartOfEvent = startEvents[EID]
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

                    if (
                        self.config.snapshotMode === 'None' ||
                        self.config.snapshotMode === 'Initial'
                    ) {
                        UserPL.payload.snapshotAvailability = 'DISABLED'
                    }

                    if (
                        endSnapshotModeRequirements.includes(
                            self.config.snapshotMode
                        )
                    ) {
                        const EventThumbnailSupport: ThumbnailSupport =
                            StartOfEvent.internal.identifiedEvent.metadata
                                .thumbnailSupport

                        switch (EventThumbnailSupport) {
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
                    delete startEvents[EID]
                }
            } else {
                // New Event
                const Now = new Date().getTime()

                const identifiedEvent = EventModels.find((eventModel) =>
                    isMatch(data, eventModel.shapeProfile)
                )

                if (!identifiedEvent) {
                    log.trace(`Unifi event not recognized: ${data}`)
                    return
                }

                const Identified =
                    identifiedEvent &&
                    self.config.eventIds.includes(identifiedEvent.metadata.id)

                if (!Identified) {
                    log.debug(
                        `Unhandled unifi event received: ${identifiedEvent.metadata}`
                    )
                    return
                }

                // Camera should always be found, as this event body wouldn't have triggered otherwise
                const Camera =
                    self.accessControllerNode.bootstrapObject?.cameras?.find(
                        (C: any) => C.id === self.config.cameraId
                    )

                if (!Camera) {
                    log.error(
                        "Seriously! This error should not occur - we wouldn't be here if the camera was not identified at the socket level."
                    )
                    return
                }

                const HasDuration = identifiedEvent.metadata.hasDuration

                const UserPL: any = {
                    payload: {
                        cameraName: Camera.name,
                        cameraType: Camera.type,
                        cameraId: Camera.id,
                        event: identifiedEvent.metadata.label,
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

                if (identifiedEvent.metadata.valueExpression) {
                    const EXP = RED.util.prepareJSONataExpression(
                        identifiedEvent.metadata.valueExpression,
                        self
                    )
                    UserPL.payload.value = RED.util.evaluateJSONataExpression(
                        EXP,
                        data
                    )
                }

                if (self.config.snapshotMode === 'None') {
                    UserPL.payload.snapshotAvailability = 'DISABLED'
                }

                if (
                    initialSnapshotModeRequirements.includes(
                        self.config.snapshotMode
                    )
                ) {
                    const EventThumbnailSupport: ThumbnailSupport =
                        identifiedEvent.metadata.thumbnailSupport

                    switch (EventThumbnailSupport) {
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
                                UserPL.payload.snapshotAvailability = 'INLINE'
                            } catch (e) {
                                UserPL.payload.snapshotAvailability = 'ERROR'
                                console.error(e)
                            }
                            break
                    }
                }

                if (HasDuration) {
                    startEvents[EID] = RED.util.cloneMessage(UserPL)
                    startEvents[EID].internal = {
                        identifiedEvent: identifiedEvent,
                    }
                }

                UserPL.payload.originalEventData = data
                self.send([UserPL, undefined])
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
