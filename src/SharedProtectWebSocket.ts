import WebSocket from 'ws'
import AccessControllerNodeConfigType from './types/AccessControllerNodeConfigType'
import AccessControllerNodeType from './types/AccessControllerNodeType'
import { endpoints } from './Endpoints'
import { ProtectApiUpdates } from './lib/ProtectApiUpdates'
import { logger } from '@nrchkb/logger'
import { Loggers } from '@nrchkb/logger/src/types'
import * as crypto from 'crypto'

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
    private bootstrap: any
    private callbacks: { [nodeId: string]: Interest }
    private WS?: WebSocket
    private Config: AccessControllerNodeConfigType
    private AccessController: AccessControllerNodeType
    private WSLogger: Loggers

    constructor(
        AccessController: AccessControllerNodeType,
        config: AccessControllerNodeConfigType,
        initialBootstrap: any
    ) {
        this.bootstrap = initialBootstrap
        this.callbacks = {}
        this.Config = config
        this.AccessController = AccessController

        const id = crypto.randomBytes(16).toString('hex')
        this.WSLogger = logger(
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
        this.WS?.removeAllListeners()
        this.WS?.close(1000)
        this.WS?.terminate()
        this.WS = undefined
    }

    private Connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const url = `${endpoints.protocol.webSocket}${this.Config.controllerIp}/proxy/protect/ws/updates?lastUpdateId=${this.bootstrap.lastUpdateId}`

            this.WS = new WebSocket(url, {
                rejectUnauthorized: false,
                headers: {
                    Cookie: await this.AccessController.getAuthCookie().then(
                        (value) => value
                    ),
                },
            })

            this.WS.on('error', (error) => {
                this.WSLogger.error(`${error}`)
                reject(error)
                setTimeout(() => {
                    this.Connect().catch((Error) => {
                        console.error(Error)
                    })
                }, DEFAULT_RECONNECT_TIMEOUT)
            })

            this.WS.on('open', () => {
                this.WSLogger.debug(`Connection to ${url} open`)
                this.WS?.on('message', (data) => {
                    let objectToSend: any

                    try {
                        objectToSend = JSON.parse(data.toString())
                    } catch (_) {
                        objectToSend = ProtectApiUpdates.decodeUpdatePacket(
                            this.WSLogger,
                            data as Buffer
                        )
                    }

                    Object.keys(this.callbacks).forEach((Node) => {
                        const Interest = this.callbacks[Node]
                        if (Interest.deviceId === objectToSend.payload.camera) {
                            Interest.callback(objectToSend)
                        }
                    })
                })

                this.WS?.on('close', () => {
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

    updateLastUpdateId(newBootstrap: any): void {
        if (newBootstrap.lastUpdateId !== this.bootstrap.lastUpdateId) {
            this.WSLogger.debug(
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
