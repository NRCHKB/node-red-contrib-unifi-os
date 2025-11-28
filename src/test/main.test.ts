import { loggerSetup } from '@nrchkb/logger'
import nock from 'nock'
import helper from 'node-red-node-test-helper'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const unifiAccessControllerNode = require('../../build/nodes/AccessController')
const unifiProtectNode = require('../../build/nodes/Protect')
const unifiRequestNode = require('../../build/nodes/Request')
const unifi = require('../../build/nodes/unifi')

loggerSetup({
    debugEnabled: true,
    errorEnabled: true,
    traceEnabled: false,
})

nock('https://localhost')
    .persist()
    .post('/api/auth/login')
    .reply(200, 'Ok', { 'set-cookie': ['COOKIE'] })
nock('https://localhost').persist().post('/api/auth/logout').reply(200)
nock('https://localhost').persist().get('/test').reply(200)
nock('https://localhost')
    .persist()
    .get('/proxy/protect/api/bootstrap')
    .reply(200)
nock('https://localhost')
    .persist()
    .get('/proxy/protect/ws/updates?lastUpdateId=undefined')
    .reply(200)

helper.init(require.resolve('node-red'))

describe('UniFi Node', function () {
    beforeAll(
        () =>
            new Promise<void>((resolve) => {
                helper.startServer(resolve)
            })
    )

    afterAll(
        () =>
            new Promise<void>((resolve) => {
                helper.stopServer(resolve)
            })
    )

    afterEach(() => {
        return helper.unload()
    })

    let AC1: any
    let R1: any
    let P1: any

    it('Initialize', async () => {
        await helper.load(
            [
                unifi,
                unifiAccessControllerNode,
                unifiRequestNode,
                unifiProtectNode,
            ],
            [
                {
                    id: 'ac1',
                    type: 'unifi-access-controller',
                    name: 'UDM Pro',
                    // @ts-ignore
                    controllerIp: 'localhost',
                },
                {
                    id: 'r1',
                    type: 'unifi-request',
                    name: 'UDM Pro Requester',
                    // @ts-ignore
                    endpoint: '/test',
                    // @ts-ignore
                    accessControllerNodeId: 'ac1',
                },
                {
                    id: 'p1',
                    type: 'unifi-protect',
                    name: 'Protect',
                    // @ts-ignore
                    accessControllerNodeId: 'ac1',
                },
            ],
            {
                ac1: {
                    username: 'test-user',
                    password: 'test-pass',
                },
            }
        )

        AC1 = helper.getNode('ac1')
        while (AC1.initialized === false) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        R1 = helper.getNode('r1')
        P1 = helper.getNode('p1')

        expect(AC1).toHaveProperty('name', 'UDM Pro')
        expect(R1).toHaveProperty('name', 'UDM Pro Requester')
        expect(P1).toHaveProperty('name', 'Protect')
    })
})
