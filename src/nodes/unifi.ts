import { logger, loggerSetup } from '@nrchkb/logger'
import Axios from 'axios'
import axios from 'axios'
import { NodeAPI } from 'node-red'
import * as util from 'util'

import { cookieToObject } from '../lib/cookieHelper'
import { HttpError } from '../types/HttpError'
import { UnifiResponse, UnifiResponseMetaMsg } from '../types/UnifiResponse'

loggerSetup({ timestampEnabled: 'UniFi' })

module.exports = (RED: NodeAPI) => {
    const log = logger('UniFi')

    Axios.interceptors.request.use(
        (config) => {
            log.debug(`Sending request to: ${config.url}`)

            if (config.headers) {
                if (
                    config.headers.cookie &&
                    config.method?.toLowerCase() !== 'get'
                ) {
                    // Create x-csrf-token
                    const composedCookie = cookieToObject(
                        config.headers.cookie as string
                    )

                    if ('TOKEN' in composedCookie) {
                        const [, jwtEncodedBody] =
                            composedCookie['TOKEN'].split('.')

                        if (jwtEncodedBody) {
                            const buffer = Buffer.from(jwtEncodedBody, 'base64')
                            const { csrfToken } = JSON.parse(
                                buffer.toString('ascii')
                            )

                            if (csrfToken) {
                                config.headers['x-csrf-token'] = csrfToken
                            }
                        }
                    }
                }
            }

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
        function (error: any) {
            if (axios.isCancel(error)) {
                log.trace(`Request cancelled: ${error.message}`)
                return Promise.reject(error)
            }

            const nodeId = error?.response?.config?.headers?.['X-Request-ID']
            const relatedNode = RED.nodes.getNode(nodeId)

            const unifiResponse = error?.response?.data as UnifiResponse

            log.error(
                `Bad response from: ${
                    error?.response?.config?.url ?? error?.config?.url
                }`,
                true,
                relatedNode
            )
            log.trace(util.inspect(error?.response))

            if (error?.code === 'ETIMEDOUT') {
                const msg = 'Connect ETIMEDOUT'
                return Promise.reject(new Error(msg))
            }

            switch (error?.response?.status) {
                case 400:
                    if (
                        unifiResponse?.meta?.msg ==
                        UnifiResponseMetaMsg.INVALID_PAYLOAD
                    ) {
                        const msg = `Invalid Payload ${unifiResponse?.meta?.validationError?.field} ${unifiResponse?.meta?.validationError?.pattern}`
                        log.error(msg)
                        return Promise.reject(new Error(msg))
                    }

                    log.error('Invalid Payload: ' + error, true, relatedNode)
                    throw new HttpError('Invalid Payload', 403)
                case 401:
                    if (
                        unifiResponse?.meta?.msg ==
                        UnifiResponseMetaMsg.NO_SITE_CONTEXT
                    ) {
                        log.error('No Site Context')
                        return Promise.reject(new Error('No Site Context'))
                    }

                    log.error('Unauthorized: ' + error, true, relatedNode)
                    return Promise.reject(new HttpError('Unauthorized', 401))
                case 403:
                    log.error('Forbidden access: ' + error, true, relatedNode)
                    return Promise.reject(
                        new HttpError('Forbidden access', 403)
                    )
                case 404:
                    log.error('Endpoint not found: ' + error, true, relatedNode)
                    return Promise.reject(
                        new HttpError('Endpoint not found', 404)
                    )
            }

            log.trace(util.inspect(error))
            return Promise.reject(error)
        }
    )

    log.debug('Initialized')
}
