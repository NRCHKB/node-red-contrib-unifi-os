import { NodeDef } from 'node-red'

type RequestNodeConfigType = NodeDef & {
    accessControllerNodeId: string
}

export default RequestNodeConfigType
