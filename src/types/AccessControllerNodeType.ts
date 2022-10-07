import { Method, ResponseType } from 'axios'
import { Node } from 'node-red'

import AccessControllerNodeConfigType from './AccessControllerNodeConfigType'
import ControllerType from './ControllerType'
import { UnifiResponse } from './UnifiResponse'

type AccessControllerNodeType = Node & {
    config: AccessControllerNodeConfigType
    getAuthCookie: (regenerate?: boolean) => Promise<string | undefined>
    authCookie: string | undefined // Authorization TOKEN cookie
    abortController: AbortController // controller used to cancel auth request
    request: (
        nodeId: string,
        endpoint?: string,
        method?: Method,
        data?: any,
        responseType?: ResponseType
    ) => Promise<UnifiResponse>
    initialized: boolean // If node started successfully together with test auth
    stopped: boolean // If node stopped due to delete or restart
    authenticated: boolean // If node is authenticated (it will be also true if timeout)
    credentials: {
        // For authentication, you can use Local Admin with Read Only
        username: string
        password: string
    }
    // Either UniFi OS Console for UDM or UniFi Network Application for custom app env
    controllerType: ControllerType
}

export default AccessControllerNodeType
