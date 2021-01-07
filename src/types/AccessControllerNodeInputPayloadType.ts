import { Method } from 'axios'

type AccessControllerNodeInputPayloadType = {
    endpoint?: string
    method?: Method
    data?: any
}

export default AccessControllerNodeInputPayloadType
