import { Node } from 'node-red'
import HttpNodeConfigType from './HttpNodeConfigType'
import LoginNodeType from './LoginNodeType'

type HttpNodeType = Node & {
    config: HttpNodeConfigType
    loginNode: LoginNodeType
}

export default HttpNodeType
