import { NodeDef } from 'node-red'

type LoginNodeConfigType = NodeDef & {
    name: string
    controllerIp: string
    username: string
    pass: string
}

export default LoginNodeConfigType
