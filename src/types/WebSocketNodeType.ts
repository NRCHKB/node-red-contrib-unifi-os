import { Node } from 'node-red'
import AccessControllerNodeType from './AccessControllerNodeType'
import WebSocketNodeConfigType from './WebSocketNodeConfigType'
import WebSocket from 'ws'

type WebSocketNodeType = Node & {
    config: WebSocketNodeConfigType
    accessControllerNode: AccessControllerNodeType
    endpoint: string
    ws?: WebSocket & { id?: string }
}

export default WebSocketNodeType
