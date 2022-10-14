export type UnifiEventModel = {
    shapeProfile: any
    metadata: {
        label: string
        hasDuration: boolean
        id: string
    }
}
const EventModels: UnifiEventModel[] = [
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
