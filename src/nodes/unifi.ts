import Axios from 'axios'
import { NodeAPI } from 'node-red'
import { logger } from '../logger'
import { HttpError } from '../types/HttpError'
import { UnifiResponseMetaMsg } from '../types/UnifiResponse'

module.exports = (_: NodeAPI) => {
    const [logDebug, logError, logTrace] = logger('*', 'main')

    Axios.interceptors.request.use(
        (config) => {
            logDebug('Sent request to: ' + config.url)
            logTrace(config)
            return config
        },
        function (error) {
            logError('Failed to send request due to: ' + error)
            return Promise.reject(error)
        }
    )

    Axios.interceptors.response.use(
        (response) => {
            logDebug('Successful response from: ' + response.config.url)
            logTrace(response)
            return response
        },
        function (error) {
            switch (error?.response?.status) {
                case 401:
                    if (
                        error?.response?.data?.meta?.msg ==
                        UnifiResponseMetaMsg.NO_SITE_CONTEXT
                    ) {
                        logDebug('No Site Context')
                        throw new Error('No Site Context')
                    }

                    logError('Unauthorized: ' + error)
                    throw new HttpError('Unauthorized', 401)
                case 403:
                    logError('Forbidden access: ' + error)
                    throw new HttpError('Forbidden access', 403)
                case 404:
                    logError('Endpoint not found: ' + error)
                    throw new HttpError('Endpoint not found', 404)
            }

            logError(
                'Wrong response from ' +
                    error?.response?.config?.url +
                    ' due to: ' +
                    error
            )
            return Promise.reject(error)
        }
    )

    logDebug('Initialized')
}
