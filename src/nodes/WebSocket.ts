import { logger } from '@nrchkb/logger'
import { Loggers } from '@nrchkb/logger/src/types'
import * as crypto from 'crypto'
import { NodeAPI } from 'node-red'
import util from 'util'
import WebSocket from 'ws'

import { endpoints } from '../Endpoints'
import { ProtectApiUpdates } from '../lib/ProtectApiUpdates'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import WebSocketNodeConfigType from '../types/WebSocketNodeConfigType'
import WebSocketNodeInputPayloadType from '../types/WebSocketNodeInputPayloadType'
import WebSocketNodeType from '../types/WebSocketNodeType'

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
        log: Loggers,
        action: string,
        callback: () => void
    ): Promise<void> => {
        if (self.ws) {
            self.ws.removeAllListeners()
            self.ws.close(1000, `Node ${action}`)
            self.ws.terminate()
            log.debug(`ws ${self.ws?.['id']} closed`)
            self.ws = undefined
        } else {
            log.debug('ws already closed')
        }

        callback()
    }

    const setupWebsocket = async (self: WebSocketNodeType): Promise<void> => {
        const connectWebSocket = async () => {
            const wsPort =
                self.accessControllerNode.config.wsPort ||
                endpoints[self.accessControllerNode.controllerType].wsport
            const url = `${endpoints.protocol.webSocket}${self.accessControllerNode.config.controllerIp}:${wsPort}${self.endpoint}`

            const id = crypto.randomBytes(16).toString('hex')
            const wsLogger = logger('UniFi', `WebSocket:${id}`, self.name, self)

            self.ws = new WebSocket(url, {
                rejectUnauthorized: false,
                headers: {
                    Cookie: await self.accessControllerNode
                        .getAuthCookie()
                        .then((value) => value),
                },
            })

            self.ws.id = id

            if (
                !self.ws ||
                self.ws.readyState === WebSocket.CLOSING ||
                self.ws.readyState === WebSocket.CLOSED
            ) {
                wsLogger.trace(
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
                    wsLogger.debug(`Connection to ${url} open`)

                    self.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'Connection open',
                    })
                })

                let tick = false
                self.ws.on('message', (data) => {
                    wsLogger.trace('Received data')

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
                                    wsLogger,
                                    data as Buffer
                                )

                            self.send({
                                payload: protectApiUpdate,
                            })
                        } catch (error: any) {
                            wsLogger.error(error)
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
                    wsLogger.error(`${error}`)

                    self.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'Error occurred',
                    })
                })

                self.ws.on('close', (code, reason) => {
                    wsLogger.debug(
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
                        wsLogger.trace(
                            'Connection possibly closed by node itself'
                        )
                    } else {
                        if (code === 1006) {
                            wsLogger.error('Is UniFi server down?', false)
                        }

                        setTimeout(
                            connectWebSocket,
                            self.config.reconnectTimeout ??
                                DEFAULT_RECONNECT_TIMEOUT
                        )
                    }
                })

                self.ws.on('unexpected-response', (request, response) => {
                    wsLogger.error('unexpected-response from the server')
                    try {
                        wsLogger.error(util.inspect(request))
                        wsLogger.error(util.inspect(response))
                    } catch (error: any) {
                        wsLogger.error(error)
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
        }).then(async () => {
            await body.call(self)
        })
    }

    const body = async function (this: WebSocketNodeType) {
        const self = this
        const log = logger('UniFi', 'WebSocket', self.name, self)

        self.endpoint = self.config.endpoint
        await setupWebsocket(self)

        self.on('input', async (msg) => {
            log.debug('Received input message: ' + util.inspect(msg))

            const inputPayload =
                validateInputPayload<WebSocketNodeInputPayloadType>(
                    self,
                    msg.payload
                )

            const newEndpoint = inputPayload.endpoint ?? self.config.endpoint

            if (newEndpoint?.trim().length) {
                if (self.endpoint != newEndpoint) {
                    self.endpoint = newEndpoint

                    await stopWebsocket(self, log, 'reconfigured', () =>
                        setupWebsocket(self)
                    )
                } else {
                    log.debug(
                        `Input ignored, endpoint did not change: ${self.endpoint}, ${inputPayload.endpoint}, ${self.config.endpoint}`
                    )
                }
            } else {
                log.debug(
                    `Input ignored, new endpoint is empty: ${self.endpoint}, ${inputPayload.endpoint}, ${self.config.endpoint}`
                )
            }
        })

        self.on('close', (removed: boolean, done: () => void) => {
            const cleanup = async () => {
                self.status({
                    fill: 'grey',
                    shape: 'dot',
                    text: 'Disconnecting',
                })

                log.debug(
                    `Disconnecting - node ${removed ? 'removed' : 'restarted'}`
                )

                await stopWebsocket(
                    self,
                    log,
                    `${removed ? 'removed' : 'restarted'}`,
                    done
                )
            }

            cleanup()
        })

        if (self.endpoint?.trim().length && !!self.ws) {
            await setupWebsocket(self)
        }

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
