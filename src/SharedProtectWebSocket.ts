import { logger } from '@nrchkb/logger'
import { Loggers } from '@nrchkb/logger/src/types'
import WebSocket from 'ws'

import { endpoints } from './Endpoints'
import { ProtectApiUpdates } from './lib/ProtectApiUpdates'
import AccessControllerNodeConfigType from './types/AccessControllerNodeConfigType'
import AccessControllerNodeType from './types/AccessControllerNodeType'
import { Bootstrap } from './types/Bootstrap'

const CLOSE_REASON = 'SELF_CLOSE'
export type WSDataCallback = (data: any) => void
export interface Interest {
    deviceId: string
    callback: WSDataCallback
}

export class SharedProtectWebSocket {
    private bootstrap: Bootstrap
    private callbacks: { [nodeId: string]: Interest }
    private ws?: WebSocket
    private accessControllerConfig: AccessControllerNodeConfigType
    private accessController: AccessControllerNodeType
    private wsLogger: Loggers
    private heartbeatTimer?: NodeJS.Timeout
    private reconnectTimer?: NodeJS.Timeout
    private didOnceConnect = false
    private RECONNECT_TIMEOUT = 90000
    private HEARTBEAT_INTERVAL = 15000
    private pongReceived = false // for some reason we get 2 pongs to 1 ping - this is to clear up confusion on debug

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
            this.HEARTBEAT_INTERVAL =
                this.accessControllerConfig.protectSocketHeartbeatInterval
        }

        if (this.accessControllerConfig.protectSocketReconnectTimeout) {
            this.RECONNECT_TIMEOUT =
                this.accessControllerConfig.protectSocketReconnectTimeout
        }

        this.wsLogger = logger('UniFi', 'SharedProtectWebSocket')

        this.connect().catch((Error) => {
            console.error(Error)
        })
    }

    shutdown(): void {
        this.disconnect()
        this.callbacks = {}
    }

    // A full disconnect
    private disconnect(): void {
        this.wsLogger.debug('Disconnecting...')
        this.pongReceived = false
        if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer)
        this.ws?.removeAllListeners()
        this.ws?.close(1000, CLOSE_REASON)
        this.ws?.terminate()
        this.ws = undefined
    }

    // Heartbeat in 15, 14, 13....
    private scheduleHeartbeat(): void {
        this.wsLogger.trace(
            `Scheduling heartbeat: ${this.HEARTBEAT_INTERVAL}...`
        )
        this.heartbeatTimer = setTimeout(
            () => this.heartbeat(),
            this.HEARTBEAT_INTERVAL
        )
    }

    // The Heartbeat its self
    private heartbeat(): void {
        this.wsLogger.trace('Sending heartbeat...')
        this.pongReceived = false
        this.ws?.ping()
        this.reconnect()
    }

    // Heartbeat received, schedule another
    private heartbeatReceived(): void {
        if (this.pongReceived) {
            return
        }
        this.pongReceived = true
        this.wsLogger.trace('Heartbeat received, cancelling reconnects...')
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        this.scheduleHeartbeat()
    }

    // Reconnect
    private reconnect(): void {
        this.wsLogger.debug(
            `Scheduling reconnect: ${this.RECONNECT_TIMEOUT}...`
        )
        this.reconnectTimer = setTimeout(() => {
            this.disconnect()
            this.connect().catch((Error) => {
                console.error(Error)
            })
        }, this.RECONNECT_TIMEOUT)
    }

    private connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const url = `${endpoints.protocol.webSocket}${this.accessControllerConfig.controllerIp}/proxy/protect/ws/updates?lastUpdateId=${this.bootstrap.lastUpdateId}`

            this.wsLogger.debug(`Connecting to ${url}...`)

            this.ws = new WebSocket(url, {
                rejectUnauthorized: false,
                headers: {
                    Cookie: await this.accessController.getAuthCookie(),
                },
            })

            this.ws?.on('error', (error) => {
                this.wsLogger.error(`${error}`)
                reject(error)
                if (this.didOnceConnect) {
                    this.reconnect()
                }
            })

            this.ws?.on('open', () => {
                // once connected - no reason to not try to reconnect after a drop (as at this point we know it should be available)
                this.didOnceConnect = true
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

                this.ws?.on('close', (code, reason) => {
                    this.wsLogger.debug(
                        `Connection to ${url} closed. Code: ${code}, Reason: ${reason.toString()}`
                    )
                    switch (code) {
                        case 1000:
                            if (reason.toString() !== CLOSE_REASON) {
                                /* This wasn't me, therefore the server requested we close. We better schedule a reconnect, it could be restarting */
                                this.reconnect()
                            }
                            break

                        case 1006:
                            /* Well this was unexpected - We better schedule a reconnect */
                            this.reconnect()
                            break

                        case 1012:
                            /* The console is being restarted, lets schedule a reconnect */
                            this.reconnect()
                            break
                    }
                })

                /* This should in theory provide recovery for both the console suddenly being disconnect or some other lost connection */
                this.ws?.on('pong', () => this.heartbeatReceived())
                this.scheduleHeartbeat()

                resolve()
            })
        })
    }

    deregisterInterest(nodeId: string): void {
        delete this.callbacks[nodeId]
    }

    registerInterest(nodeId: string, interest: Interest): void {
        this.callbacks[nodeId] = interest
    }

    updateLastUpdateId(newBootstrap: Bootstrap): void {
        if (newBootstrap.lastUpdateId !== this.bootstrap.lastUpdateId) {
            this.wsLogger.debug(
                'New lastUpdateId received, re-configuring Shared Socket'
            )
            this.bootstrap = newBootstrap
            this.disconnect()
            this.connect().catch((Error) => {
                console.error(Error)
            })
        } else {
            this.bootstrap = newBootstrap
        }
    }
}
