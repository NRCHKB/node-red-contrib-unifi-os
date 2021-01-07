import { NodeDef } from 'node-red'

type WebSocketNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    endpoint: string
}

export default WebSocketNodeConfigType
