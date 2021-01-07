import { NodeDef } from 'node-red'
import { Method } from 'axios'

type RequestNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    endpoint?: string
    method: Method
    data?: any
}

export default RequestNodeConfigType
