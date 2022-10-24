import { NodeDef } from 'node-red'

type ProtectNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    cameraId: string
    eventIds: string[]
    snapshotMode: string
    snapshotW: string
    snapshotH: string
    delayedSnapshotTime: string
}
export default ProtectNodeConfigType
