import Axios from 'axios'
import { NodeAPI } from 'node-red'

module.exports = (_: NodeAPI) => {
    const debug = require('debug')('UNIFI')

    Axios.interceptors.request.use(
        (config) => {
            debug('Sent request: ' + config)
            return config
        },
        function (error) {
            debug('Failed to send request due to: ' + error)
            return Promise.reject(error)
        }
    )

    Axios.interceptors.response.use(
        (response) => {
            debug('Successful response: ' + response)
            return response
        },
        function (error) {
            debug('Wrong response due to: ' + error)
            return Promise.reject(error)
        }
    )

    debug('Initialized')
}
