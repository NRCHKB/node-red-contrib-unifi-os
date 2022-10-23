import { NodeDef } from 'node-red'

type ProtectNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    cameraId: string
    eventIds: string[]
    includeSnapshot: boolean
    snapshotW: string
    snapshotH: string
}
export default ProtectNodeConfigType
