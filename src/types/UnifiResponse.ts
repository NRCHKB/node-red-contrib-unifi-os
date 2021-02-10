export enum UnifiResponseMetaMsg {
    NO_SITE_CONTEXT = 'api.err.NoSiteContext',
    INVALID_PAYLOAD = 'api.err.InvalidPayload',
}

export enum UnifiResponseMetaRc {
    ERROR = 'error',
    OK = 'ok',
}

export type ValidationError = {
    field?: string
    pattern?: string
    msg?: UnifiResponseMetaMsg
}

export type Meta = {
    rc: UnifiResponseMetaRc
    validationError?: ValidationError
    msg?: string
}

export type UnifiResponse = {
    meta: Meta
    data: any
}
