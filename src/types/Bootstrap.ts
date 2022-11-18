export type Bootstrap = {
    cameras?: Camera[]
    lastUpdateId?: string
}

export type Camera = {
    name: string
    type: string
    id: string
}
