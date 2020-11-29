import { NodeDef } from 'node-red'

type LoginNodeConfigType = NodeDef & {
    name: string
    controllerIp: string
}

export default LoginNodeConfigType
