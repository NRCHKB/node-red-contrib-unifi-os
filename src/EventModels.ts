export enum ThumbnailSupport {
    START_END = 0,
    START_WITH_DELAYED_END = 1,
    SINGLE_DELAYED = 2,
    SINGLE = 3,
    NONE = 4,
}

export type Metadata =
    | {
          label: string
          id: string
          hasDuration: false
          valueExpression: string
          thumbnailSupport: ThumbnailSupport
      }
    | {
          label: string
          id: string
          hasDuration: boolean
          /* This must not be provided if hasDuration is true, but we need to check if it exists later, hence why its here and forced to be undefined */
          /* Removing it here throws on build */
          /* If someone can improve on this - please do so :) - i don't do much typescript */
          valueExpression?: undefined
          thumbnailSupport: ThumbnailSupport
      }

export type UnifiEventModel = {
    shapeProfile: Record<string, any>
    metadata: Metadata
}

const EventModels: UnifiEventModel[] = [
    {
        shapeProfile: {
            action: {
                modelKey: 'camera',
            },
            payload: {
                isMotionDetected: true,
            },
        },
        metadata: {
            label: 'Motion Detection',
            hasDuration: false,
            id: 'MotionDetection',
            valueExpression: 'payload.isMotionDetected',
            thumbnailSupport: ThumbnailSupport.NONE,
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
        metadata: {
            label: 'Motion Detection',
            hasDuration: false,
            id: 'MotionDetection',
            valueExpression: 'payload.isMotionDetected',
            thumbnailSupport: ThumbnailSupport.NONE,
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
        metadata: {
            label: 'Motion Event',
            hasDuration: true,
            id: 'MotionEvent',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
        },
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
        metadata: {
            label: 'Door Bell Ring',
            hasDuration: false,
            id: 'DoorBell',
            thumbnailSupport: ThumbnailSupport.SINGLE_DELAYED,
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
        metadata: {
            label: 'Package Detected',
            hasDuration: false,
            id: 'Package',
            thumbnailSupport: ThumbnailSupport.SINGLE_DELAYED,
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
        metadata: {
            label: 'Vehicle Detected',
            hasDuration: true,
            id: 'Vehicle',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
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
        metadata: {
            label: 'Person Detected',
            hasDuration: true,
            id: 'Person',
            thumbnailSupport: ThumbnailSupport.START_WITH_DELAYED_END,
        },
    },
]

export default EventModels
