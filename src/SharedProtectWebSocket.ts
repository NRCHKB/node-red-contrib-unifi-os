import { logger } from '@nrchkb/logger'
import { Loggers } from '@nrchkb/logger/src/types'
import { Mutex } from 'async-mutex'
import WebSocket, { RawData } from 'ws'

import { endpoints } from './Endpoints'
import { ProtectApiUpdates } from './lib/ProtectApiUpdates'
import AccessControllerNodeConfigType from './types/AccessControllerNodeConfigType'
import AccessControllerNodeType from './types/AccessControllerNodeType'
import { Bootstrap } from './types/Bootstrap'

export enum SocketStatus {
    UNKNOWN = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    RECOVERING_CONNECTION = 3,
    CONNECTION_ERROR = 4,
    HEARTBEAT = 5,
}

export type WSDataCallback = (data: any) => void
export type WSStatusCallback = (status: SocketStatus) => void

export interface Interest {
    dataCallback: WSDataCallback
    statusCallback: WSStatusCallback
}

export class SharedProtectWebSocket {
    private bootstrap: Bootstrap
    private callbacks: { [nodeId: string]: Interest }
    private ws?: WebSocket
    private accessControllerConfig: AccessControllerNodeConfigType
    private accessController: AccessControllerNodeType
    private wsLogger: Loggers
    private RECONNECT_TIMEOUT = 15000
    private HEARTBEAT_INTERVAL = 10000
    private INITIAL_CONNECT_ERROR_THRESHOLD = 1000
    private reconnectAttempts = 0
    private currentStatus: SocketStatus = SocketStatus.UNKNOWN

    constructor(
        AccessController: AccessControllerNodeType,
        config: AccessControllerNodeConfigType,
        initialBootstrap: Bootstrap
    ) {
        this.bootstrap = initialBootstrap
        this.callbacks = {}
        this.accessControllerConfig = config
        this.accessController = AccessController

        if (this.accessControllerConfig.protectSocketHeartbeatInterval) {
            this.HEARTBEAT_INTERVAL = parseInt(
                this.accessControllerConfig.protectSocketHeartbeatInterval
            )
        }

        if (this.accessControllerConfig.protectSocketReconnectTimeout) {
            this.RECONNECT_TIMEOUT = parseInt(
                this.accessControllerConfig.protectSocketReconnectTimeout
            )
        }

        this.wsLogger = logger('UniFi', 'SharedProtectWebSocket')

        this.connect()
    }

    shutdown(): void {
        this.disconnect()
        this.callbacks = {}
    }

    private disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = undefined
        }
        this.ws?.removeAllListeners()
        this.ws?.close()
        this.ws?.terminate()
        this.ws = undefined
    }

    private updateStatusForNodes = (Status: SocketStatus): Promise<void> => {
        this.currentStatus = Status
        return new Promise((resolve) => {
            Object.keys(this.callbacks).forEach((ID) => {
                this.callbacks[ID].statusCallback(Status)
            })

            resolve()
        })
    }

    private reconnectTimer: NodeJS.Timeout | undefined
    private mutex = new Mutex()
    private async reset(): Promise<void> {
        await this.mutex.runExclusive(async () => {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer)
                this.reconnectTimer = undefined
                await this.updateStatusForNodes(SocketStatus.CONNECTED)
                this.watchDog()
            }
        })
    }

    private async watchDog(): Promise<void> {
        setTimeout(async () => {
            await this.updateStatusForNodes(SocketStatus.HEARTBEAT)
            if (!this.ws || this.ws?.readyState !== WebSocket.OPEN) {
                return
            }
            this.ws?.ping()

            this.reconnectTimer = setTimeout(async () => {
                await this.mutex.runExclusive(async () => {
                    this.disconnect()
                    await this.updateStatusForNodes(
                        SocketStatus.RECOVERING_CONNECTION
                    )
                    this.connect()
                })
            }, this.RECONNECT_TIMEOUT)

            this.ws?.once('pong', this.reset.bind(this))
        }, this.HEARTBEAT_INTERVAL)
    }

    private processData(Data: RawData): void {
        let objectToSend: any

        try {
            objectToSend = JSON.parse(Data.toString())
        } catch (_) {
            objectToSend = ProtectApiUpdates.decodeUpdatePacket(
                this.wsLogger,
                Data as Buffer
            )
        }

        Object.keys(this.callbacks).forEach((Node) => {
            const Interest = this.callbacks[Node]
            Interest.dataCallback(objectToSend)
        })
    }

    private processError(): void {
        // This needs improving, but the watchDog is kind of taking care of stuff
    }

    private connectCheckInterval: NodeJS.Timeout | undefined
    private connectMutex = new Mutex()

    private async connect(): Promise<void> {
        await this.mutex.runExclusive(async () => {
            if (this.currentStatus !== SocketStatus.RECOVERING_CONNECTION) {
                await this.updateStatusForNodes(SocketStatus.CONNECTING)
            }

            const wsPort =
                this.accessControllerConfig.wsPort ||
                endpoints[this.accessController.controllerType].wsport
            const url = `${endpoints.protocol.webSocket}${this.accessControllerConfig.controllerIp}:${wsPort}/proxy/protect/ws/updates?lastUpdateId=${this.bootstrap.lastUpdateId}`

            this.ws = new WebSocket(url, {
                rejectUnauthorized: false,
                headers: {
                    Cookie: await this.accessController.getAuthCookie(),
                },
            })

            this.ws.on('error', this.processError.bind(this))

            this.connectCheckInterval = setInterval(async () => {
                await this.connectMutex.runExclusive(async () => {
                    switch (this.ws?.readyState) {
                        case WebSocket.OPEN:
                            clearInterval(this.connectCheckInterval!)
                            this.connectCheckInterval = undefined
                            await this.updateStatusForNodes(
                                SocketStatus.CONNECTED
                            )
                            this.reconnectAttempts = 0
                            this.watchDog()
                            this.ws.on('message', this.processData.bind(this))
                            break

                        case WebSocket.CONNECTING:
                            // Do nothing, just keep waiting.
                            break

                        case WebSocket.CLOSED:
                        case WebSocket.CLOSING:
                            if (
                                this.reconnectAttempts >
                                this.INITIAL_CONNECT_ERROR_THRESHOLD
                            ) {
                                clearInterval(this.connectCheckInterval!)
                                this.connectCheckInterval = undefined
                                await this.updateStatusForNodes(
                                    SocketStatus.CONNECTION_ERROR
                                )
                            } else {
                                clearInterval(this.connectCheckInterval!)
                                this.connectCheckInterval = undefined
                                this.reconnectAttempts++
                                setTimeout(async () => {
                                    await this.connect()
                                }, this.RECONNECT_TIMEOUT)
                            }
                            break
                    }
                })
            }, 5000)
        })
    }

    deregisterInterest(nodeId: string): void {
        delete this.callbacks[nodeId]
    }

    registerInterest(nodeId: string, interest: Interest): SocketStatus {
        this.callbacks[nodeId] = interest
        return this.currentStatus
    }

    updateLastUpdateId(newBootstrap: Bootstrap): void {
        if (newBootstrap.lastUpdateId !== this.bootstrap.lastUpdateId) {
            this.disconnect()
            this.bootstrap = newBootstrap
            this.connect()
        } else {
            this.bootstrap = newBootstrap
        }
    }
}
