export enum UnifiResponseMetaMsg {
    NO_SITE_CONTEXT = 'api.err.NoSiteContext',
}

export enum UnifiResponseMetaRc {
    ERROR = 'error',
    OK = 'ok',
}

export type Meta = {
    rc: string
    msg?: string
}

export type UnifiResponse = {
    meta: Meta
    data: any
}
