import 'should'

import { afterEach, beforeEach, describe, it } from 'mocha'

const helper = require('node-red-node-test-helper')

const unifi = require('../nodes/unifi')
const unifiRequestNode = require('../nodes/Request')
const unifiAccessControllerNode = require('../nodes/AccessController')

const nock = require('nock')
nock('https://localhost')
    .persist()
    .post('/api/auth/login')
    .reply(200, 'Ok', { 'set-cookie': ['COOKIE'] })
nock('https://localhost').persist().post('/api/logout').reply(200)
nock('https://localhost').persist().get('/test').reply(200)

helper.init(require.resolve('node-red'))

describe('UniFi Node', function () {
    this.timeout(30000)

    beforeEach(function (done) {
        helper.startServer(done)
    })

    afterEach(function (done) {
        helper.unload()
        helper.stopServer(done)
    })

    it('Initialize', function (done) {
        helper
            .load(
                [unifi, unifiAccessControllerNode, unifiRequestNode],
                [
                    {
                        id: 'r1',
                        type: 'unifi-request',
                        name: 'UDM Pro Requester',
                        endpoint: '/test',
                        accessControllerNodeId: 'ac1',
                    },
                    {
                        id: 'ac1',
                        type: 'unifi-access-controller',
                        name: 'UDM Pro',
                        controllerIp: 'localhost',
                    },
                ],
                function () {
                    helper.getNode('r1')
                    helper.getNode('ac1')
                    done()
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})
