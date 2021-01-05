import { Node } from 'node-red'
import RequestNodeConfigType from './RequestNodeConfigType'
import AccessControllerNodeType from './AccessControllerNodeType'

type RequestNodeType = Node & {
    config: RequestNodeConfigType
    accessControllerNode: AccessControllerNodeType
}

export default RequestNodeType
