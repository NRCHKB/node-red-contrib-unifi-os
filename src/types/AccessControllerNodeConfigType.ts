import { NodeDef } from 'node-red'

import ControllerType from './ControllerType'

type AccessControllerNodeConfigType = NodeDef & {
    name: string
    controllerIp: string
    controllerPort?: string
    wsPort?: string
    controllerType?: ControllerType
    protectSocketReconnectTimeout?: string
    protectSocketHeartbeatInterval?: string
}

export default AccessControllerNodeConfigType
