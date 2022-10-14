import { NodeDef } from 'node-red'

type ProtectNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    cameraId: string
    eventIds: string[]
}
export default ProtectNodeConfigType
