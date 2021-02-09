import Axios from 'axios'
import { NodeAPI } from 'node-red'
import { logger } from '@nrchkb/logger'
import { HttpError } from '../types/HttpError'
import { UnifiResponse, UnifiResponseMetaMsg } from '../types/UnifiResponse'
import * as util from 'util'

module.exports = (_: NodeAPI) => {
    const log = logger('UniFi')

    Axios.interceptors.request.use(
        (config) => {
            log.debug(`Sending request to: ${config.url}`)

            const contentLength = config.data?.toString().length ?? 0
            if (contentLength > 0) {
                config.headers['Content-Length'] = contentLength
            }

            if (
                config.headers.cookie &&
                config.method?.toLowerCase() !== 'get'
            ) {
                // Create x-csrf-token
                const composedCookie: { [key: string]: string } = {}

                ;(config.headers.cookie[0] as string)
                    .replace(/ /g, '')
                    .split(';')
                    .forEach((c) => {
                        if (c.includes('=')) {
                            const [key, value] = c.split('=')
                            composedCookie[key] = value
                        } else {
                            composedCookie[c] = ''
                        }
                    })

                if ('TOKEN' in composedCookie) {
                    const [, jwtEncodedBody] = composedCookie['TOKEN'].split(
                        '.'
                    )

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
            const unifiResponse = error?.response?.data as UnifiResponse

            log.debug(`Bad response from: ${error?.response?.config?.url}`)
            log.trace(util.inspect(error?.response))

            switch (error?.response?.status) {
                case 400:
                    if (
                        unifiResponse?.meta?.msg ==
                        UnifiResponseMetaMsg.INVALID_PAYLOAD
                    ) {
                        log.debug(
                            `Invalid Payload ${unifiResponse?.meta?.validationError?.field} ${unifiResponse?.meta?.validationError?.pattern}`
                        )
                        throw new Error('Invalid Payload')
                    }

                    log.error('Invalid Payload: ' + error)
                    throw new HttpError('Invalid Payload', 403)
                case 401:
                    if (
                        unifiResponse?.meta?.msg ==
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

            log.trace(util.inspect(error))
            return Promise.reject(error)
        }
    )

    log.debug('Initialized')
}
