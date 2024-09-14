import { logger } from '@nrchkb/logger'
import { isMatch } from 'lodash'
import { NodeAPI } from 'node-red'
import util from 'util'

import EventModels, { CameraIDLocation, ThumbnailSupport } from '../EventModels'
import { Interest, SocketStatus } from '../SharedProtectWebSocket'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import { Camera } from '../types/Bootstrap'
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
                text: 'Access Controller not found / or configured',
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
                        fill: 'grey',
                        shape: 'dot',
                        text: 'Initializing...',
                    })

                    setTimeout(checkAndWait, 1500)
                }
            }

            checkAndWait()
        }).then(() => {
            self.status({
                fill: 'green',
                shape: 'dot',
                text: 'Connected',
            })
            body.call(self)
        })
    }

    const body = function (this: ProtectNodeType) {
        const self = this
        const log = logger('UniFi', 'Protect', self.name, self)

        // Used to store the Start of an event with a duration.
        const startEvents: any = {}

        self.on('close', (_: boolean, done: () => void) => {
            self.accessControllerNode.protectSharedWS?.deregisterInterest(
                self.id
            )
            done()
        })

        self.on('input', (msg) => {
            log.debug('Received input message: ' + util.inspect(msg))
            if (msg.topic) {
                const Path = getReqPath('cameras', msg.topic)

                self.status({
                    fill: 'grey',
                    shape: 'dot',
                    text: 'Sending...',
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

                        self.send([{ payload: data, inputMsg: msg }, undefined])
                    })
                    .catch((error) => {
                        log.error(error)

                        self.status({
                            fill: 'red',
                            shape: 'dot',
                            text: error.message,
                        })
                    })
            }
        })

        self.status({
            fill: 'green',
            shape: 'dot',
            text: 'Initialized',
        })

        // Awaiter (Node RED 3.1 evaluateJSONataExpression )
        let _AwaiterResolver: (value?: unknown) => void
        const Awaiter = () => {
            return new Promise((Resolve) => {
                _AwaiterResolver = Resolve
            })
        }

        // Register our interest in Protect Updates.
        const handleUpdate = async (data: any) => {
            // Debug ?
            if (self.config.debug) {
                self.send([undefined, { payload: data }])
            }

            // Get ID
            const eventId = data.action.id

            // Date
            const Now = new Date().getTime()

            // Check if we are expecting an end
            const startEvent = startEvents[eventId]

            if (startEvent) {
                // Is this an end only event
                const onEnd =
                    startEvent.payload._profile.startMetadata.sendOnEnd === true
                if (!onEnd) {
                    startEvent.payload.timestamps.endDate =
                        data.payload.end || Now
                    startEvent.payload.eventStatus = 'EndOfEvent'
                } else {
                    startEvent.payload.timestamps = {
                        eventDate: data.payload.end || Now,
                    }
                }

                // has End Metadata
                const hasMeta =
                    startEvent.payload._profile.endMetadata !== undefined
                if (hasMeta) {
                    if (
                        startEvent.payload._profile.endMetadata
                            .valueExpression !== undefined
                    ) {
                        const Waiter = Awaiter()
                        const EXP = RED.util.prepareJSONataExpression(
                            startEvent.payload._profile.endMetadata
                                .valueExpression,
                            self
                        )
                        RED.util.evaluateJSONataExpression(
                            EXP,
                            { _startData: startEvent, ...data },
                            (_err, res) => {
                                startEvent.payload.value = res
                                _AwaiterResolver()
                            }
                        )

                        await Promise.all([Waiter])
                    }

                    if (
                        startEvent.payload._profile.endMetadata.label !==
                        undefined
                    ) {
                        startEvent.payload.event =
                            startEvent.payload._profile.endMetadata.label
                    }
                }

                const EventThumbnailSupport: ThumbnailSupport | undefined =
                    startEvent.payload._profile.startMetadata.thumbnailSupport

                switch (EventThumbnailSupport) {
                    case ThumbnailSupport.START_END:
                        startEvent.payload.snapshot = {
                            availability: 'NOW',
                            uri: `/proxy/protect/api/events/${eventId}/thumbnail`,
                        }
                        break
                    case ThumbnailSupport.START_WITH_DELAYED_END:
                        startEvent.payload.snapshot = {
                            availability: 'WITH_DELAY',
                            uri: `/proxy/protect/api/events/${eventId}/thumbnail`,
                        }
                        break
                }

                delete startEvent.payload._profile
                delete startEvent.payload.expectEndEvent
                self.send([RED.util.cloneMessage(startEvent), undefined])
                delete startEvents[eventId]
            } else {
                let Camera: Camera | undefined

                const Cams: string[] = self.config.cameraIds?.split(',') || []

                const identifiedEvent = EventModels.find((eventModel) =>
                    isMatch(data, eventModel.shapeProfile)
                )

                if (!identifiedEvent || !identifiedEvent.startMetadata.id) {
                    return
                }

                switch (identifiedEvent.startMetadata.idLocation) {
                    case CameraIDLocation.ACTION_ID:
                        if (!Cams.includes(data.action.id)) {
                            return
                        }
                        Camera =
                            self.accessControllerNode.bootstrapObject?.cameras?.find(
                                (c) => c.id === data.action.id
                            )
                        break

                    case CameraIDLocation.PAYLOAD_CAMERA:
                        if (!Cams.includes(data.payload.camera)) {
                            return
                        }
                        Camera =
                            self.accessControllerNode.bootstrapObject?.cameras?.find(
                                (c) => c.id === data.payload.camera
                            )
                        break

                    case CameraIDLocation.ACTION_RECORDID:
                        if (!Cams.includes(data.action.recordId)) {
                            return
                        }
                        Camera =
                            self.accessControllerNode.bootstrapObject?.cameras?.find(
                                (c) => c.id === data.action.recordId
                            )
                        break
                }

                if (!Camera) {
                    return
                }

                const hasEnd =
                    identifiedEvent.startMetadata.hasMultiple === true
                const onEnd = identifiedEvent.startMetadata.sendOnEnd === true

                const EVIDsArray: string[] =
                    self.config.eventIds?.split(',') || []

                const matchedEvent = EVIDsArray.includes(
                    identifiedEvent.startMetadata.id
                )

                if (!matchedEvent) {
                    return
                }

                const UserPL: any = {
                    payload: {
                        event: identifiedEvent.startMetadata.label,
                        eventId: eventId,
                        cameraName: Camera.name,
                        cameraType: Camera.type,
                        cameraId: Camera.id,
                        expectEndEvent: hasEnd && !onEnd,
                    },
                }

                const EventThumbnailSupport: ThumbnailSupport | undefined =
                    identifiedEvent.startMetadata.thumbnailSupport

                switch (EventThumbnailSupport) {
                    case ThumbnailSupport.SINGLE:
                    case ThumbnailSupport.START_END:
                    case ThumbnailSupport.START_WITH_DELAYED_END:
                        UserPL.payload.snapshot = {
                            availability: 'NOW',
                            uri: `/proxy/protect/api/events/${eventId}/thumbnail`,
                        }
                        break
                    case ThumbnailSupport.SINGLE_DELAYED:
                        UserPL.payload.snapshot = {
                            availability: 'WITH_DELAY',
                            uri: `/proxy/protect/api/events/${eventId}/thumbnail`,
                        }
                        break
                }

                if (identifiedEvent.startMetadata.valueExpression) {
                    const Waiter = Awaiter()
                    const EXP = RED.util.prepareJSONataExpression(
                        identifiedEvent.startMetadata.valueExpression,
                        self
                    )
                    RED.util.evaluateJSONataExpression(
                        EXP,
                        data,
                        (_err, res) => {
                            UserPL.payload.value = res
                            _AwaiterResolver()
                        }
                    )

                    await Promise.all([Waiter])
                }

                UserPL.payload.originalEventData = data
                UserPL.topic = UserPL.payload.cameraName

                if (hasEnd && !onEnd) {
                    UserPL.payload.eventStatus = 'StartOfEvent'
                    UserPL.payload.timestamps = {
                        startDate: data.payload.start || Now,
                    }
                    self.send([UserPL, undefined])
                    startEvents[eventId] = RED.util.cloneMessage(UserPL)
                    startEvents[eventId].payload._profile = identifiedEvent
                }

                if (hasEnd && onEnd) {
                    UserPL.payload._profile = identifiedEvent
                    startEvents[eventId] = UserPL
                }

                if (!hasEnd) {
                    UserPL.payload.timestamps = {
                        eventDate: data.payload.start || Now,
                    }
                    self.send([UserPL, undefined])
                }
            }
        }

        const statusCallback = (Status: SocketStatus) => {
            switch (Status) {
                case SocketStatus.UNKNOWN:
                    self.status({
                        fill: 'grey',
                        shape: 'dot',
                        text: 'Unknown',
                    })
                    break

                case SocketStatus.CONNECTION_ERROR:
                    self.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'Connection error',
                    })
                    break

                case SocketStatus.CONNECTED:
                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'Connected',
                    })
                    break

                case SocketStatus.RECOVERING_CONNECTION:
                    self.status({
                        fill: 'yellow',
                        shape: 'dot',
                        text: 'Recovering connection...',
                    })
                    break

                case SocketStatus.HEARTBEAT:
                    self.status({
                        fill: 'yellow',
                        shape: 'dot',
                        text: 'Sending heartbeat...',
                    })
                    break
            }
        }

        const I: Interest = {
            dataCallback: handleUpdate,
            statusCallback: statusCallback,
        }
        const Status =
            self.accessControllerNode.protectSharedWS?.registerInterest(
                self.id,
                I
            )
        if (Status !== undefined) {
            statusCallback(Status)
        }

        log.debug('Initialized')
    }

    // Register the Protect Node
    RED.nodes.registerType('unifi-protect', init)

    logger('UniFi', 'Protect').debug('Type registered')
}
