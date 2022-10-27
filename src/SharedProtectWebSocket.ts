import { logger } from '@nrchkb/logger'
import { Loggers } from '@nrchkb/logger/src/types'
import * as crypto from 'crypto'
import WebSocket from 'ws'

import { endpoints } from './Endpoints'
import { ProtectApiUpdates } from './lib/ProtectApiUpdates'
import AccessControllerNodeConfigType from './types/AccessControllerNodeConfigType'
import AccessControllerNodeType from './types/AccessControllerNodeType'

/**
 * DEFAULT_RECONNECT_TIMEOUT is to wait until next try to connect web socket in case of error or server side closed socket (for example UniFi restart)
 */
const DEFAULT_RECONNECT_TIMEOUT = 90000
export type WSDataCallback = (data: any) => void
export interface Interest {
    deviceId: string
    callback: WSDataCallback
}

export class SharedProtectWebSocket {
    private bootstrap: Record<string, any>
    private callbacks: { [nodeId: string]: Interest }
    private ws?: WebSocket
    private config: AccessControllerNodeConfigType
    private accessController: AccessControllerNodeType
    private wsLogger: Loggers

    constructor(
        AccessController: AccessControllerNodeType,
        config: AccessControllerNodeConfigType,
        initialBootstrap: Record<string, any>
    ) {
        this.bootstrap = initialBootstrap
        this.callbacks = {}
        this.config = config
        this.accessController = AccessController

        const id = crypto.randomBytes(16).toString('hex')
        this.wsLogger = logger(
            'UniFi',
            `WebSocket:${id}`,
            'SharedProtectWebSocket',
            undefined
        )

        this.Connect().catch((Error) => {
            console.error(Error)
        })
    }

    Shutdown(): void {
        this.Disconnect()
        this.callbacks = {}
    }

    private Disconnect(): void {
        this.ws?.removeAllListeners()
        this.ws?.close(1000)
        this.ws?.terminate()
        this.ws = undefined
    }

    private Connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const url = `${endpoints.protocol.webSocket}${this.config.controllerIp}/proxy/protect/ws/updates?lastUpdateId=${this.bootstrap.lastUpdateId}`

            this.ws = new WebSocket(url, {
                rejectUnauthorized: false,
                headers: {
                    Cookie: await this.accessController
                        .getAuthCookie()
                        .then((value) => value),
                },
            })

            this.ws.on('error', (error) => {
                this.wsLogger.error(`${error}`)
                reject(error)
                setTimeout(() => {
                    this.Connect().catch((Error) => {
                        console.error(Error)
                    })
                }, DEFAULT_RECONNECT_TIMEOUT)
            })

            this.ws.on('open', () => {
                this.wsLogger.debug(`Connection to ${url} open`)
                this.ws?.on('message', (data) => {
                    let objectToSend: any

                    try {
                        objectToSend = JSON.parse(data.toString())
                    } catch (_) {
                        objectToSend = ProtectApiUpdates.decodeUpdatePacket(
                            this.wsLogger,
                            data as Buffer
                        )
                    }

                    Object.keys(this.callbacks).forEach((Node) => {
                        const Interest = this.callbacks[Node]
                        if (
                            Interest.deviceId === objectToSend.payload.camera ||
                            objectToSend.payload.camera === undefined
                        ) {
                            Interest.callback(objectToSend)
                        }
                    })
                })

                this.ws?.on('close', () => {
                    setTimeout(() => {
                        this.Connect().catch((Error) => {
                            console.error(Error)
                        })
                    }, DEFAULT_RECONNECT_TIMEOUT)
                })
                resolve()
            })
        })
    }

    degisterInterest(nodeId: string): void {
        delete this.callbacks[nodeId]
    }

    registerInterest(nodeId: string, interest: Interest): void {
        this.callbacks[nodeId] = interest
    }

    updateLastUpdateId(newBootstrap: Record<string, any>): void {
        if (newBootstrap.lastUpdateId !== this.bootstrap.lastUpdateId) {
            this.wsLogger.debug(
                'New lastUpdateId received, re-configuring Shared socket'
            )
            this.bootstrap = newBootstrap
            this.Disconnect()
            this.Connect().catch((Error) => {
                console.error(Error)
            })
        } else {
            this.bootstrap = newBootstrap
        }
    }
}
