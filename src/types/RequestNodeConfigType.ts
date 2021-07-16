import { NodeDef } from 'node-red'
import { Method, ResponseType } from 'axios'

type RequestNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    endpoint?: string
    method: Method
    data?: any
    responseType?: ResponseType
}

export default RequestNodeConfigType
