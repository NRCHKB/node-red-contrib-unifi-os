import { NodeDef } from 'node-red'

type ProtectNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    cameraIds: string
    eventIds: string
    debug: boolean
}
export default ProtectNodeConfigType
