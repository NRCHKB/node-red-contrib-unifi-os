import { Method, ResponseType } from 'axios'
import { NodeDef } from 'node-red'

type RequestNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    endpoint?: string
    method: Method
    data?: any
    responseType?: ResponseType
}

export default RequestNodeConfigType
