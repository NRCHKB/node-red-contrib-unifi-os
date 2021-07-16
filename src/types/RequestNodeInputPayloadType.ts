import { Method, ResponseType } from 'axios'

type RequestNodeInputPayloadType = {
    endpoint?: string
    method?: Method
    data?: any
    responseType?: ResponseType
}

export default RequestNodeInputPayloadType
