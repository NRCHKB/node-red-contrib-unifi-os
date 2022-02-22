import { NodeDef } from 'node-red'

type WebSocketNodeConfigType = NodeDef & {
    /**
     * AccessController config node ID set up by Node-RED UI selector
     */
    accessControllerNodeId: string
    /**
     * UniFi web socket endpoint. For example /proxy/network/wss/s/default/events or /api/ws/system
     */
    endpoint?: string
    /**
     * How long in milliseconds to wait until trying to reconnect web socket client
     */
    reconnectTimeout?: number
}

export default WebSocketNodeConfigType
