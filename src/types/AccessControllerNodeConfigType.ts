import { NodeDef } from 'node-red'

import ControllerType from './ControllerType'

type AccessControllerNodeConfigType = NodeDef & {
    name: string
    controllerIp: string
    controllerPort?: string
    controllerType?: ControllerType
    protectSocketReconnectTimeout?: number
    protectSocketHeartbeatInterval?: number
}

export default AccessControllerNodeConfigType
