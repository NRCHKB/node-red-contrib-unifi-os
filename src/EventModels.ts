export type Metadata =
    | {
          label: string
          id: string
          hasDuration: false
          valueExpression: string
          supportsSnapshot: boolean
      }
    | {
          label: string
          id: string
          hasDuration: true | false
          valueExpression?: undefined
          supportsSnapshot: boolean
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
            supportsSnapshot: false,
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
            supportsSnapshot: false,
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
            supportsSnapshot: true,
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
            supportsSnapshot: true,
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
            supportsSnapshot: true,
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
            supportsSnapshot: true,
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
            supportsSnapshot: true,
        },
    },
]

export default EventModels
