import { Node } from 'node-red'
import WebSocket from 'ws'

import AccessControllerNodeType from './AccessControllerNodeType'
import WebSocketNodeConfigType from './WebSocketNodeConfigType'

type WebSocketNodeType = Node & {
    config: WebSocketNodeConfigType
    accessControllerNode: AccessControllerNodeType
    endpoint?: string
    ws?: WebSocket & { id?: string }
}

export default WebSocketNodeType
