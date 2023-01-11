import { logger } from '@nrchkb/logger'
import Axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import * as https from 'https'
import { NodeAPI } from 'node-red'

import { endpoints } from '../Endpoints'
import { SharedProtectWebSocket } from '../SharedProtectWebSocket'
import AccessControllerNodeConfigType from '../types/AccessControllerNodeConfigType'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import { Bootstrap } from '../types/Bootstrap'
import { HttpError } from '../types/HttpError'
import { UnifiResponse } from '../types/UnifiResponse'

const {
    AbortController,
} = require('abortcontroller-polyfill/dist/cjs-ponyfill')

const bootstrapURI = '/proxy/protect/api/bootstrap'

const urlBuilder = (self: AccessControllerNodeType, endpoint?: string) => {
    return (
        endpoints.protocol.base +
        self.config.controllerIp +
        (self.config.controllerPort?.trim().length
            ? `:${self.config.controllerPort}`
            : '') +
        endpoint
    )
}

module.exports = (RED: NodeAPI) => {
    const body = function (
        this: AccessControllerNodeType,
        config: AccessControllerNodeConfigType
    ) {
        const self = this
        const log = logger('UniFi', 'AccessController', self.name, self)

        RED.nodes.createNode(self, config)
        self.config = config

        self.initialized = false
        self.authenticated = false
        self.stopped = false
        self.controllerType = self.config.controllerType ?? 'UniFiOSConsole'
        self.abortController = new AbortController()

        // Register an Admin HTTP endpoint - so node config editors can obtain bootstraps (to obtain listings)
        RED.httpAdmin.get(
            `/nrchkb/unifi/bootsrap/${self.id}/`,
            RED.auth.needsPermission('flows.write'),
            (_req, res) => {
                if (self.bootstrapObject) {
                    res.status(200).json(self.bootstrapObject)
                } else {
                    // lets issue a 501 - Not Implemented for this host, given no Protect bootstrap was available
                    res.status(501).end()
                }
            }
        )
        // Remove HTTP Endpoint
        const removeBootstrapHTTPEndpoint = () => {
            const Check = (Route: any) => {
                if (Route.route === undefined) {
                    return true
                }
                if (
                    !Route.route.path.startsWith(
                        `/nrchkb/unifi/bootsrap/${self.id}`
                    )
                ) {
                    return true
                }

                return false
            }
            RED.httpAdmin._router.stack =
                RED.httpAdmin._router.stack.filter(Check)
        }

        // The Boostrap request
        const getBootstrap = async (init?: boolean) => {
            self.request(self.id, bootstrapURI, 'GET', undefined, 'json')
                .then((res: UnifiResponse) => {
                    self.bootstrapObject = res as Bootstrap

                    if (init) {
                        // Fire up a shared websocket to the Protect WS endpoint
                        self.protectSharedWS = new SharedProtectWebSocket(
                            self,
                            self.config,
                            self.bootstrapObject
                        )
                    } else {
                        // Update the shared websocket to the Protect WS endpoint, so we can connect to its new lastUpdateId
                        self.protectSharedWS?.updateLastUpdateId(
                            self.bootstrapObject
                        )
                    }
                })
                .catch((error) => {
                    log.debug(
                        `Received error when obtaining bootstrap: ${error}, assuming this is to be expected, i.e no protect instance.`
                    )
                })
        }

        const refresh = (init?: boolean) => {
            self.getAuthCookie(true)
                .catch((error) => {
                    console.error(error)
                    log.error('Failed to pre authenticate')
                })
                .then(() => {
                    if (init) {
                        log.debug('Initialized')
                        self.initialized = true
                        log.debug('Successfully pre authenticated')
                    } else {
                        log.debug('Cookies refreshed')
                    }
                    // Fetch bootstrap (only for Protect)
                    getBootstrap(init)
                })
        }

        // Refresh cookies every 45 minutes
        const refreshTimeout = setInterval(() => {
            refresh()
        }, 2700000)

        self.getAuthCookie = (regenerate?: boolean) => {
            if (self.authCookie && regenerate !== true) {
                log.debug('Returning stored auth cookie')
                return Promise.resolve(self.authCookie)
            }

            const url = urlBuilder(
                self,
                endpoints[self.controllerType].login.url
            )

            return new Promise((resolve) => {
                const authenticateWithRetry = () => {
                    Axios.post(
                        url,
                        {
                            username: self.credentials.username,
                            password: self.credentials.password,
                        },
                        {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized: false,
                                keepAlive: true,
                            }),
                            signal: self.abortController.signal,
                        }
                    )
                        .then((response: AxiosResponse) => {
                            if (response.status === 200) {
                                self.authCookie =
                                    response.headers['set-cookie']?.[0]
                                log.trace(`Cookie received: ${self.authCookie}`)

                                self.authenticated = true
                                resolve(self.authCookie)
                            }
                        })
                        .catch((reason: any) => {
                            if (reason?.name === 'AbortError') {
                                log.error('Request Aborted')
                            }

                            self.authenticated = false
                            self.authCookie = undefined

                            if (!self.stopped) {
                                setTimeout(
                                    authenticateWithRetry,
                                    endpoints[self.controllerType].login.retry
                                )
                            }
                        })
                }

                authenticateWithRetry()
            })
        }

        self.request = async (nodeId, endpoint, method, data, responseType) => {
            if (!endpoint) {
                Promise.reject(new Error('endpoint cannot be empty!'))
            }

            if (!method) {
                Promise.reject(new Error('method cannot be empty!'))
            }

            const url = urlBuilder(self, endpoint)

            return new Promise((resolve, reject) => {
                const axiosRequest = async () => {
                    const Config: AxiosRequestConfig = {
                        url,
                        method,
                        data,
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                            keepAlive: true,
                        }),
                        headers: {
                            cookie: (await self.getAuthCookie()) ?? '',
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-Request-ID': nodeId,
                        },
                        withCredentials: true,
                        responseType,
                    }

                    Axios.request<UnifiResponse>(Config)
                        .catch((error) => {
                            if (error instanceof HttpError) {
                                if (error.status === 401) {
                                    self.authenticated = false
                                    self.authCookie = undefined
                                    setTimeout(
                                        axiosRequest,
                                        endpoints[self.controllerType].login
                                            .retry
                                    )
                                }
                            }

                            reject(error)
                        })
                        .then((response) => {
                            if (response) {
                                resolve(response.data)
                            }
                        })
                }
                axiosRequest()
            })
        }

        self.on('close', (_: boolean, done: () => void) => {
            self.stopped = true
            clearTimeout(refreshTimeout)
            removeBootstrapHTTPEndpoint()
            self.protectSharedWS?.shutdown()
            self.abortController.abort()

            const logout = async () => {
                const url = urlBuilder(
                    self,
                    endpoints[self.controllerType].logout.url
                )

                Axios.post(
                    url,
                    {},
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                            keepAlive: true,
                        }),
                        headers: {
                            cookie: (await self.getAuthCookie()) ?? '',
                        },
                    }
                )
                    .catch((error) => {
                        console.error(error)
                        log.error('Failed to log out')
                        done()
                    })
                    .then(() => {
                        log.trace('Successfully logged out')
                        done()
                    })
            }

            logout()
        })

        // Initial cookies fetch
        refresh(true)
    }

    RED.nodes.registerType('unifi-access-controller', body, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
        },
    })

    logger('UniFi', 'AccessController').debug('Type registered')
}
