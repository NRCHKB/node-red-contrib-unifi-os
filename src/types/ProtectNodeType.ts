import { NodeMessage } from '@node-red/registry'
import { Node } from 'node-red'

import AccessControllerNodeType from './AccessControllerNodeType'
import ProtectNodeConfigType from './ProtectNodeConfigType'

type ProtectNodeType = Node & {
    config: ProtectNodeConfigType
    accessControllerNode: AccessControllerNodeType
} & {
    send(msg?: any | NodeMessage | NodeMessage[]): void
}

export default ProtectNodeType
