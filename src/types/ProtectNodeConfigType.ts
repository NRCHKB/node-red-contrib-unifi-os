import { NodeDef } from 'node-red'

type ProtectNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    cameraId: string
    eventIds: string[]
    snapshotMode: string
    snapshotW: string
    snapshotH: string
    delayedSnapshotTime: number
    fanned: boolean
    outputs: number
}
export default ProtectNodeConfigType
