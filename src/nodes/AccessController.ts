import { NodeAPI } from 'node-red'
import AccessControllerNodeType from '../types/AccessControllerNodeType'
import AccessControllerNodeConfigType from '../types/AccessControllerNodeConfigType'
import Axios, { AxiosResponse } from 'axios'
import * as https from 'https'
import { logger } from '../logger'
import { HttpError } from '../types/HttpError'
import { endpoints } from '../Endpoints'
import { UnifiResponse } from '../types/UnifiResponse'

module.exports = (RED: NodeAPI) => {
    const body = function (
        this: AccessControllerNodeType,
        config: AccessControllerNodeConfigType
    ) {
        const self = this
        RED.nodes.createNode(self, config)
        self.config = config
        const [logDebug, logError] = logger(self.name, 'AccessController')

        self.initialized = false
        self.authenticated = false

        self.getAuthCookie = () => {
            if (self.authCookie) {
                logDebug('Returning stored auth cookie')
                return Promise.resolve(self.authCookie)
            }

            const url =
                endpoints.protocol.base +
                self.config.controllerIp +
                endpoints.login.url

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
                        }
                    )
                        .then((response: AxiosResponse) => {
                            if (response.status === 200) {
                                self.authCookie = response.headers['set-cookie']
                                logDebug('Cookie received: ' + self.authCookie)

                                self.authenticated = true
                                resolve(self.authCookie)
                            }
                        })
                        .catch((reason: any) => {
                            console.error(reason)
                            self.authenticated = false
                            self.authCookie = undefined

                            setTimeout(
                                authenticateWithRetry,
                                endpoints.login.retry
                            )
                        })
                }

                authenticateWithRetry()
            })
        }

        self.get = async (endpoint: string) => {
            const url =
                endpoints.protocol.base + self.config.controllerIp + endpoint

            return new Promise((resolve, reject) => {
                const get = async () => {
                    Axios.get<UnifiResponse>(url, {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                            keepAlive: true,
                        }),
                        headers: {
                            cookie: await self
                                .getAuthCookie()
                                .then((value) => value),
                        },
                        withCredentials: true,
                    })
                        .catch((error) => {
                            if (error instanceof HttpError) {
                                if (error.status === 401) {
                                    self.authenticated = false
                                    self.authCookie = undefined
                                    setTimeout(get, endpoints.login.retry)
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
                get()
            })
        }

        self.on('close', () => {
            const url =
                endpoints.protocol.base +
                self.config.controllerIp +
                endpoints.logout.url

            Axios.post(
                url,
                {},
                {
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false,
                        keepAlive: true,
                    }),
                }
            )
        })

        self.getAuthCookie()
            .catch((error) => {
                console.error(error)
                logError('Failed to pre authenticate')
            })
            .then(() => {
                logDebug('Initialized')
                self.initialized = true
                logDebug('Successfully pre authenticated')
            })
    }

    RED.nodes.registerType('unifi-access-controller', body, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
        },
    })
}
