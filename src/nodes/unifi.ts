import Axios from 'axios'
import { NodeAPI } from 'node-red'
import { logger, loggerSetup } from '@nrchkb/logger'
import { HttpError } from '../types/HttpError'
import { UnifiResponseMetaMsg } from '../types/UnifiResponse'
import * as util from 'util'

loggerSetup({ namespacePrefix: 'UniFi' })

module.exports = (_: NodeAPI) => {
    const log = logger()

    Axios.interceptors.request.use(
        (config) => {
            log.debug(`Sent request to: ${config.url}`)
            log.trace(util.inspect(config))
            return config
        },
        function (error) {
            log.error(`Failed to send request due to: ${error}`)
            return Promise.reject(error)
        }
    )

    Axios.interceptors.response.use(
        (response) => {
            log.debug(`Successful response from: ${response.config.url}`)
            log.trace(util.inspect(response))
            return response
        },
        function (error) {
            switch (error?.response?.status) {
                case 401:
                    if (
                        error?.response?.data?.meta?.msg ==
                        UnifiResponseMetaMsg.NO_SITE_CONTEXT
                    ) {
                        log.debug('No Site Context')
                        throw new Error('No Site Context')
                    }

                    log.error('Unauthorized: ' + error)
                    throw new HttpError('Unauthorized', 401)
                case 403:
                    log.error('Forbidden access: ' + error)
                    throw new HttpError('Forbidden access', 403)
                case 404:
                    log.error('Endpoint not found: ' + error)
                    throw new HttpError('Endpoint not found', 404)
            }

            log.error(
                `Wrong response from ${error?.response?.config?.url} due to: ${error}`
            )
            return Promise.reject(error)
        }
    )

    log.debug('Initialized')
}
