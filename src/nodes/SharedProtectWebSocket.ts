import WebSocket from 'ws'
import EventEmitter from 'events'
import AccessControllerNodeConfigType from '../types/AccessControllerNodeConfigType'

/**
 * DEFAULT_RECONNECT_TIMEOUT is to wait until next try to connect web socket in case of error or server side closed socket (for example UniFi restart)
 */
const DEFAULT_RECONNECT_TIMEOUT = 90000

export class SharedProtectWebSocket extends EventEmitter {
    constructor(config: AccessControllerNodeConfigType, initialBootstrap: any) {
        super()
        console.log(DEFAULT_RECONNECT_TIMEOUT)
        console.log(config)
        console.log(initialBootstrap)
    }

    updateLastUpdateId(newBootstrap: any): void {
        console.log(newBootstrap)
    }
}
