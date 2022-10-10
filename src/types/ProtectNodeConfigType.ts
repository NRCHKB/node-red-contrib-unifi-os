import { NodeDef } from 'node-red'

type ProtectNodeConfigType = NodeDef & {
    accessControllerNodeId: string
    cameraId: string
}
export default ProtectNodeConfigType
