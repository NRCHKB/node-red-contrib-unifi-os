import { Node } from 'node-red'
import ProtectNodeConfigType from './ProtectNodeConfigType'
import AccessControllerNodeType from './AccessControllerNodeType'
import { NodeMessage } from '@node-red/registry'

type ProtectNodeType = Node & {
    config: ProtectNodeConfigType
    accessControllerNode: AccessControllerNodeType
} & {
    send(msg?: any | NodeMessage | NodeMessage[]): void
}

export default ProtectNodeType
