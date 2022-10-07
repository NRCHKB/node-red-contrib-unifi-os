import { NodeMessage } from '@node-red/registry'
import { Node } from 'node-red'

import AccessControllerNodeType from './AccessControllerNodeType'
import RequestNodeConfigType from './RequestNodeConfigType'

type RequestNodeType = Node & {
    config: RequestNodeConfigType
    accessControllerNode: AccessControllerNodeType
} & {
    send(msg?: any | NodeMessage | NodeMessage[]): void
}

export default RequestNodeType
