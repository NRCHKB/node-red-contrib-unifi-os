export enum ThumbnailSupport {
    START_END = 0,
    START_WITH_DELAYED_END = 1,
    SINGLE_DELAYED = 2,
    SINGLE = 3,
    NONE = 4,
}

export enum CameraIDLocation {
    PAYLOAD_CAMERA = 0,
    ACTION_ID = 1,
    NONE = 2,
    ACTION_RECORDID = 3,
}

export type Metadata =
    | {
          label: string
          id: string
          hasMultiple: boolean
          valueExpression?: string
          thumbnailSupport: ThumbnailSupport
          idLocation: CameraIDLocation
          sendOnEnd?: boolean
      }
    | {
          label?: string
          valueExpression?: string
          hasMultiple?: never
          id?: never
          thumbnailSupport?: never
          sendOnEnd?: never
      }

export type UnifiEventModel = {
    shapeProfile: Record<string, unknown>
    startMetadata: Metadata
    endMetadata?: Metadata 
}

const EventModels: UnifiEventModel[] = [
    {
        shapeProfile: {
            action: {
                action: 'add',
                modelKey: 'event',
            },
            payload: {
                type: 'smartAudioDetect',
            },
        },
        startMetadata: {
            label: 'Audio Detection',
            hasMultiple: true,
            sendOnEnd: true,
            id: 'AudioDetection',
            thumbnailSupport: ThumbnailSupport.SINGLE_DELAYED,
            idLocation: CameraIDLocation.ACTION_RECORDID,
            
        },
        endMetadata: {
            valueExpression: 'payload.smartDetectTypes',
        },
    },
    {
        shapeProfile: {
            action: {
                modelKey: 'camera',
            },
            payload: {
                isMotionDetected: false,
            },
        },
        startMetadata: {
            label: 'Motion Detection',
            hasMultiple: false,
            id: 'MotionDetection',
            valueExpression: 'payload.isMotionDetected',
            thumbnailSupport: ThumbnailSupport.NONE,
            idLocation: CameraIDLocation.ACTION_ID,
        },
    },
    {
        shapeProfile: {
            action: {
                modelKey: 'camera',
            },
            payload: {
                isMotionDetected: true,
            },
        },
        startMetadata: {
            label: 'Motion Detection',
            hasMultiple: false,
            id: 'MotionDetection',
            valueExpression: 'payload.isMotionDetected',
            thumbnailSupport: ThumbnailSupport.NONE,
            idLocation: CameraIDLocation.ACTION_ID,
        },
    },
    {
        shapeProfile: {
            action: {
                action: 'add',
            },
            payload: {
                type: 'motion',
            },
        },
        startMetadata: {
            label: 'Motion Event',
            hasMultiple: true,
            id: 'MotionEvent',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
            idLocation: CameraIDLocation.PAYLOAD_CAMERA,
        }
    },
    {
        shapeProfile: {
            action: {
                action: 'add',
            },
            payload: {
                type: 'ring',
            },
        },
        startMetadata: {
            label: 'Door Bell Ring',
            hasMultiple: false,
            id: 'DoorBell',
            thumbnailSupport: ThumbnailSupport.SINGLE_DELAYED,
            idLocation: CameraIDLocation.PAYLOAD_CAMERA,
        },
    },
    {
        shapeProfile: {
            action: {
                action: 'add',
            },
            payload: {
                type: 'smartDetectZone',
                smartDetectTypes: ['package'],
               
            },
        },
        startMetadata: {
            label: 'Package Detected',
            hasMultiple: false,
            id: 'Package',
            thumbnailSupport: ThumbnailSupport.SINGLE_DELAYED,
            idLocation: CameraIDLocation.PAYLOAD_CAMERA,
        },
    },
    {
        shapeProfile: {
            action: {
                action: 'add',
            },
            payload: {
                type: 'smartDetectZone',
                smartDetectTypes: ['vehicle'],
              
            },
        },
        startMetadata: {
            label: 'Vehicle Detected',
            hasMultiple: true,
            id: 'Vehicle',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
            idLocation: CameraIDLocation.PAYLOAD_CAMERA,
        },
    },
    {
        shapeProfile: {
            action: {
                action: 'add',
            },
            payload: {
                type: 'smartDetectZone',
                smartDetectTypes: ['person'],
              
            },
        },
        startMetadata: {
            label: 'Person Detected',
            hasMultiple: true,
            id: 'Person',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
            idLocation: CameraIDLocation.PAYLOAD_CAMERA,
        },
    },
    {
        shapeProfile: {
            action: {
                action: 'add',
            },
            payload: {
                type: 'smartDetectZone',
                smartDetectTypes: ['animal'],
               
            },
        },
        startMetadata: {
            label: 'Animal Detected',
            hasMultiple: true,
            id: 'Animal',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
            idLocation: CameraIDLocation.PAYLOAD_CAMERA,
        },
    },
    {
        shapeProfile: {
            action: {
                action: 'add',
            },
            payload: {
                type: 'smartDetectZone',
                smartDetectTypes: ['licensePlate'],
              
            },
        },
        startMetadata: {
            label: 'License Plate Scan',
            hasMultiple: true,
            id: 'LicensePlate',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
            idLocation: CameraIDLocation.PAYLOAD_CAMERA,
        },
    },
]

export default EventModels
