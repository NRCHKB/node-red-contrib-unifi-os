import { NodeAPI } from 'node-red'
import WebSocketNodeConfigType from '../types/WebSocketNodeConfigType'
import WebSocketNodeType from '../types/WebSocketNodeType'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import WebSocket from 'ws'
import { endpoints } from '../Endpoints'
import { logger } from '@nrchkb/logger'
import util from 'util'
import WebSocketNodeInputPayloadType from '../types/WebSocketNodeInputPayloadType'
import { ProtectApiUpdates } from '../lib/ProtectApiUpdates'

/**
 * DEFAULT_RECONNECT_TIMEOUT is to wait until next try to connect web socket in case of error or server side closed socket (for example UniFi restart)
 */
const DEFAULT_RECONNECT_TIMEOUT = 90000

module.exports = (RED: NodeAPI) => {
    const validateInputPayload = <T>(
        self: WebSocketNodeType,
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

    const stopWebsocket = async (
        self: WebSocketNodeType,
        action: string,
        callback: () => void
    ): Promise<void> => {
        self.ws?.close(1000, `Node ${action}`)
        self.ws?.terminate()
        self.ws = undefined
        callback()
    }

    const setupWebsocket = async (self: WebSocketNodeType): Promise<void> => {
        const log = logger('UniFi', 'WebSocket', self.name, self)

        const url =
            endpoints.protocol.webSocket +
            self.accessControllerNode.config.controllerIp +
            self.endpoint

        const connectWebSocket = async () => {
            self.ws = new WebSocket(url, {
                rejectUnauthorized: false,
                headers: {
                    Cookie: await self.accessControllerNode
                        .getAuthCookie()
                        .then((value) => value),
                },
            })

            if (
                !self.ws ||
                self.ws.readyState === WebSocket.CLOSING ||
                self.ws.readyState === WebSocket.CLOSED
            ) {
                log.trace(
                    `Unable to connect to UniFi on ${url}. Will retry again later.`
                )

                self.status({
                    fill: 'yellow',
                    shape: 'dot',
                    text: 'Connecting...',
                })

                setTimeout(
                    connectWebSocket,
                    self.config.reconnectTimeout ?? DEFAULT_RECONNECT_TIMEOUT
                )
            } else {
                self.ws.on('open', function open() {
                    log.debug(`Connection to ${url} open`)

                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'Connection open',
                    })
                })

                let tick = false
                self.ws.on('message', (data) => {
                    try {
                        const parsedData = JSON.parse(data.toString())

                        self.send({
                            payload: parsedData,
                        })
                    } catch (_) {
                        // Let's try to decode packet
                        try {
                            const protectApiUpdate =
                                ProtectApiUpdates.decodeUpdatePacket(
                                    log,
                                    data as Buffer
                                )

                            self.send({
                                payload: protectApiUpdate,
                            })
                        } catch (error) {
                            log.error(error)
                        }
                    }

                    if (tick) {
                        self.status({
                            fill: 'blue',
                            shape: 'ring',
                            text: 'Receiving data',
                        })
                    } else {
                        self.status({
                            fill: 'grey',
                            shape: 'ring',
                            text: 'Receiving data',
                        })
                    }

                    tick = !tick
                })

                self.ws.on('error', (error) => {
                    log.error(`${error}`)

                    self.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'Error occurred',
                    })
                })

                self.ws.on('close', (code, reason) => {
                    log.debug(
                        `Connection to ${url} closed. Code:${code}${
                            reason ? `, reason: ${reason}` : ''
                        }`
                    )

                    self.send([
                        {},
                        {
                            payload: {
                                code,
                                reason,
                                url,
                            },
                        },
                    ])

                    self.status({
                        fill: 'yellow',
                        shape: 'dot',
                        text: `Connection closed. Code:${code}`,
                    })

                    if (code === 1000) {
                        log.trace('Connection possibly closed by node itself')
                    } else {
                        if (code === 1006) {
                            log.error('Is UniFi server down?', false)
                        }

                        setTimeout(
                            connectWebSocket,
                            self.config.reconnectTimeout ??
                                DEFAULT_RECONNECT_TIMEOUT
                        )
                    }
                })
            }
        }

        await connectWebSocket()
    }

    const init = function (
        this: WebSocketNodeType,
        config: WebSocketNodeConfigType
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

    const body = function (this: WebSocketNodeType) {
        const self = this
        const log = logger('UniFi', 'WebSocket', self.name, self)

        self.endpoint = self.config.endpoint
        setupWebsocket(self)

        self.on('input', (msg) => {
            log.debug('Received input message: ' + util.inspect(msg))

            const inputPayload =
                validateInputPayload<WebSocketNodeInputPayloadType>(
                    self,
                    msg.payload
                )

            if (
                self.endpoint != (inputPayload.endpoint ?? self.config.endpoint)
            ) {
                self.endpoint = inputPayload.endpoint ?? self.config.endpoint
                stopWebsocket(self, 'reconfigured', () => setupWebsocket(self))
            }
        })

        self.on('close', (removed: boolean, done: () => void) => {
            self.status({
                fill: 'grey',
                shape: 'dot',
                text: 'Disconnecting',
            })

            log.debug(
                `Disconnecting - node ${removed ? 'removed' : 'restarted'}`
            )

            stopWebsocket(self, `${removed ? 'removed' : 'restarted'}`, done)
        })

        self.status({
            fill: 'green',
            shape: 'dot',
            text: 'Initialized',
        })

        log.debug('Initialized')
    }

    // Register the requestHTTP node
    RED.nodes.registerType('unifi-web-socket', init)

    logger('UniFi', 'WebSocket').debug('Type registered')
}
