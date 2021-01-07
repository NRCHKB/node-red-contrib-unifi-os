import 'should'
import { describe, beforeEach, afterEach, it } from 'mocha'

const helper = require('node-red-node-test-helper')

const unifi = require('../../build/nodes/unifi')
const unifiRequestNode = require('../../build/nodes/Request')
const unifiWebSocketNode = require('../../build/nodes/WebSocket')
const unifiAccessControllerNode = require('../../build/nodes/AccessController')

helper.init(require.resolve('node-red'))

const flow = [
    {
        id: 'i1',
        type: 'inject',
        z: 'fe238252.c769e',
        name: '',
        props: [
            {
                p: 'payload.endpoint',
                v: '/proxy/network/api/s/default/stat/health',
                vt: 'str',
            },
        ],
        repeat: '',
        crontab: '',
        once: false,
        onceDelay: 0.1,
        topic: '',
        x: 150,
        y: 320,
        wires: [['r1']],
    },
    {
        id: 'd2',
        type: 'debug',
        z: 'fe238252.c769e',
        name: '',
        active: true,
        tosidebar: true,
        console: false,
        tostatus: false,
        complete: 'false',
        statusVal: '',
        statusType: 'auto',
        x: 510,
        y: 320,
        wires: [],
    },
    {
        id: 'r1',
        type: 'unifi-request',
        z: 'fe238252.c769e',
        name: 'UDM Pro Requester',
        accessControllerNodeId: 'ac1',
        x: 320,
        y: 320,
        wires: [['d2']],
    },
    {
        id: 'ws1',
        type: 'unifi-web-socket',
        z: 'fe238252.c769e',
        name: 'WebSocket',
        endpoint: '/api/ws/system',
        accessControllerNodeId: 'ac1',
        x: 290,
        y: 380,
        wires: [['d1']],
    },
    {
        id: 'd1',
        type: 'debug',
        z: 'fe238252.c769e',
        name: '',
        active: false,
        tosidebar: true,
        console: false,
        tostatus: false,
        complete: 'false',
        statusVal: '',
        statusType: 'auto',
        x: 510,
        y: 380,
        wires: [],
    },
    {
        id: 'ac1',
        type: 'unifi-access-controller',
        name: 'UDM Pro',
        controllerIp: '192.168.1.1',
    },
]

describe('UniFi Node', function () {
    this.timeout(30000)

    beforeEach(function (done) {
        helper.startServer(done)
    })

    afterEach(function (done) {
        helper.unload()
        helper.stopServer(done)
    })

    it('just done', function (done) {
        helper
            .load(
                [
                    unifi,
                    unifiAccessControllerNode,
                    unifiRequestNode,
                    unifiWebSocketNode,
                ],
                flow,
                function () {
                    done()
                }
            )
            .catch((error: any) => {
                done(new Error(error))
            })
    })
})
