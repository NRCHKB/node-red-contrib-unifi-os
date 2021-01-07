import { Method } from 'axios'
import { Node } from 'node-red'
import AccessControllerNodeConfigType from './AccessControllerNodeConfigType'
import { UnifiResponse } from './UnifiResponse'

type AccessControllerNodeType = Node & {
    config: AccessControllerNodeConfigType
    getAuthCookie: () => Promise<string[] | undefined>
    authCookie: string[] | undefined // Authorization TOKEN cookie
    request: (
        endpoint?: string,
        method?: Method,
        data?: any
    ) => Promise<UnifiResponse>
    initialized: boolean //If node started successfully together with test auth
    authenticated: boolean //If node is authenticated (it will be also true if timeout)
    credentials: {
        // For authentication you can use Local Admin with Read Only
        username: string
        password: string
    }
}

export default AccessControllerNodeType
