import { NodeDef } from 'node-red'

type RequestNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    endpoint?: string
}

export default RequestNodeConfigType
