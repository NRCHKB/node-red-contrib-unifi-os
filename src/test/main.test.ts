import 'should'

import { afterEach, beforeEach, describe, it } from 'mocha'

const helper = require('node-red-node-test-helper')

const unifi = require('../nodes/unifi')
const unifiRequestNode = require('../nodes/Request')
const unifiAccessControllerNode = require('../nodes/AccessController')
const unifiProtectNode = require('../nodes/Protect')

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

    let AC1
    let R1
    let P1;


    it('Initialize', function (done) {
        helper
            .load(
                [unifi, unifiAccessControllerNode, unifiRequestNode, unifiProtectNode],
                [
                    {
                        id: 'ac1',
                        type: 'unifi-access-controller',
                        name: 'UDM Pro',
                        controllerIp: 'localhost',
                    },
                    {
                        id: 'r1',
                        type: 'unifi-request',
                        name: 'UDM Pro Requester',
                        endpoint: '/test',
                        accessControllerNodeId: 'ac1',
                    },
                    {
                        id: 'p1',
                        type: 'unifi-protect',
                        name: 'Protect',
                        accessControllerNodeId: 'ac1',
                    },
                ],
                function () {
                    AC1 = helper.getNode("ac1")
                    R1 = helper.getNode("r1")
                    P1 = helper.getNode("p1")

                    AC1.should.have.property('name', 'UDM Pro');
                    R1.should.have.property('name', 'UDM Pro Requester');
                    P1.should.have.property('name', 'Protect');

                  
                    done()
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})
