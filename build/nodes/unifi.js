'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
const axios_1 = __importDefault(require('axios'))
module.exports = (_) => {
    const debug = require('debug')('UNIFI')
    axios_1.default.interceptors.request.use(
        (config) => {
            debug('Sent request: ' + config)
            return config
        },
        function (error) {
            debug('Failed to send request due to: ' + error)
            return Promise.reject(error)
        }
    )
    axios_1.default.interceptors.response.use(
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
