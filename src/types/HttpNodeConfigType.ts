import { NodeDef } from 'node-red'

type HttpNodeConfigType = NodeDef & {
    loginNodeId: string
}

export default HttpNodeConfigType
