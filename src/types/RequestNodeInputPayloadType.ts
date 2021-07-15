import { Method } from 'axios'

type RequestNodeInputPayloadType = {
    endpoint?: string
    method?: Method
    data?: any
}

export default RequestNodeInputPayloadType
