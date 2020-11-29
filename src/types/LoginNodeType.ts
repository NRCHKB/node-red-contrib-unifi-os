import { Node } from 'node-red'
import LoginNodeConfigType from './LoginNodeConfigType'

type LoginNodeType = Node & {
    config: LoginNodeConfigType
    getCreds: any
    authenticated: boolean
    setCookie: string[] | undefined
    controllerIp: string
    credentials: {
        username: string
        password: string
    }
}

export default LoginNodeType
