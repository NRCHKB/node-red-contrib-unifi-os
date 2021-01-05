import { NodeDef } from 'node-red'

type AccessControllerNodeConfigType = NodeDef & {
    name: string
    controllerIp: string
}

export default AccessControllerNodeConfigType
