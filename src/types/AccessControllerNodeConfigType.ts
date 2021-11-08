import { NodeDef } from 'node-red'
import ControllerType from './ControllerType'

type AccessControllerNodeConfigType = NodeDef & {
    name: string
    controllerIp: string
    controllerType?: ControllerType
}

export default AccessControllerNodeConfigType
