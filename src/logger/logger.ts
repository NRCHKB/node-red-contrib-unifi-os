import Debug from 'debug'

export const logger = (nodeName = '', suffix = '') => {
    const debug = Debug('UniFi:' + suffix)

    const logDebug = (message: any) => {
        debug('[%s] %s', nodeName, message)
    }

    const error = Debug('UniFiError:' + suffix)
    error.enabled = true

    const logError = (message: any) => {
        error('[%s] %s', nodeName, message)
    }

    const trace = Debug('UniFiTrace:' + suffix)

    const logTrace = (message: any) => {
        trace('[%s] %s', nodeName, message)
    }

    return [logDebug, logError, logTrace]
}
