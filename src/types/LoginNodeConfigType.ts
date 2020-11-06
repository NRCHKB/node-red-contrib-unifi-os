import { NodeDef } from 'node-red'

type LoginNodeConfigType = NodeDef & {
    controllerIp: string
    username: string
    pass: string
}

export default LoginNodeConfigType
