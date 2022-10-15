export type Metadata =
    | {
          label: string
          id: string
          hasDuration: false
          valueExpression: string
      }
    | {
          label: string
          id: string
          hasDuration: true | false
          valueExpression?: undefined
      }

export type UnifiEventModel = {
    shapeProfile: any
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
        },
    },
]

export default EventModels
