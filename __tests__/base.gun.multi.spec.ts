import { GunStorageProxy, LCState, VCState, Sig } from '../src/layer2storage'
process.env.GUN_ENV = 'false'
import Gun from 'gun'
require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')
require('gun/lib/load.js')
require('gun/lib/not.js')
require('gun/lib/path.js')

/**
 * Dummy test
 */
jest.setTimeout(1200)
describe('Dummy test', () => {
  let db0: GunStorageProxy = null
  let db1: GunStorageProxy = null

  const sigCase = {
    message: '123',
    messageHash: '1',
    v: '2',
    r: '3',
    s: '4',
    signature: '5'
  }
  const led: LCState = {
    id: 'id',
    nonce: 0,
    party: '1',
    counterparty: 'cp1',
    sig: clone(sigCase),
    sig_counterparty: clone(sigCase),
    openVCs: null,
    vcRootHash: null,
    balanceA: '1',
    balanceB: '2',
    isClosed: false,
    stateHash: '0x0'
  }
  const led2 = clone(led)
  led2.id = 'id1234'
  led2.nonce = 1

  const chan: VCState = {
    id: 'id2',
    nonce: 0,
    party: '123',
    counterparty: 'cp123',
    sig: clone(sigCase),
    sig_counterparty: clone(sigCase),
    lcId: led.id,
    balanceA: '123',
    balanceB: '222',
    isClosed: false,
    appState: null,
    stateHash: '0x0'
  }

  test('works if true is truthy', () => {
    expect(true).toBeTruthy()
  })

  test('GunStorageProxy is multiple instantiable', () => {
    const gun = new Gun({ localStorage: false, WebSocket: false })
    db0 = new GunStorageProxy(gun, 'alice')
    expect(db0.dbprefix).toEqual('alice')

    db1 = new GunStorageProxy(gun, 'bob')
    expect(db1.dbprefix).toEqual('bob')
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  test('GunStorageProxy set get', async () => {
    // check if the key somehow already exists
    const val1_0 = await db0.get('testa')
    expect(val1_0).toBeNull()
    // save a key for alice
    await db0.set('testa', { key: '123' })
    const val0 = await db0.get('testa')
    expect(val0).toMatchObject({ key: '123' })
  })

  test('GunStorageProxy multiple set get', async () => {
    // ensure alice's key is not there bot bob
    const val1_0 = await db1.get('testa')
    expect(val1_0).toBeNull()

    // save a key for bob
    await db1.set('testa', { key: '345' })
    const val2 = await db1.get('testa')
    expect(val2).toMatchObject({ key: '345' })

    // ensure old value still there for Alive
    const val0_2 = await db0.get('testa')
    expect(val0_2).toMatchObject({ key: '123' })
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  test('GunStorageProxy storeLC alice', async (done: any) => {
    const lclone = clone(led)
    const lclone2 = clone(led2)

    const r = await db0.storeLC(lclone)
    await db0.storeLC(lclone2)

    expect(r).toMatchObject(led)
    done()
  })

  test('GunStorageProxy getLC from bob should not alice', async (done: any) => {
    const val2 = await db1.getLC(led.id)
    expect(val2).toBeNull()

    done()
  })
})

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}
