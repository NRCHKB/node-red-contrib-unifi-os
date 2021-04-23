import { Node } from 'node-red'
import RequestNodeConfigType from './RequestNodeConfigType'
import AccessControllerNodeType from './AccessControllerNodeType'
import {NodeMessage} from '@node-red/registry'

type RequestNodeType = Node & {
    config: RequestNodeConfigType
    accessControllerNode: AccessControllerNodeType
} & {
    send(msg?: any | NodeMessage | NodeMessage[]): void;
}

export default RequestNodeType
