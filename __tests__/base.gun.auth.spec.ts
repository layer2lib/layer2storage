process.env.GUN_ENV = 'false'
import * as Gun from 'gun'
require('gun/sea.js')
import { GunStorageProxy, LCState, VCState, Sig } from '../src/layer2storage'
require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')
require('gun/lib/load.js')
require('gun/lib/not.js')
require('gun/lib/path.js')
/**
 * Dummy test
 */
jest.setTimeout(800)

describe('Dummy test', () => {
  let db: GunStorageProxy = null
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
    expect(typeof window).toEqual('undefined')
  })

  test('GunStorageProxy is instantiable', done => {
    const gun = Gun({ localStorage: true, radisk: true })
    db = new GunStorageProxy(gun, 'lauren')
    expect(db.dbprefix).toEqual('lauren')
    done()
    // await db.register('1', '2')
    // await db.login('1', '2')
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  test('GunStorageProxy register users', async done => {
    db.register('bob', 'test123', err => {
      console.log(err, err)
      expect(err).toHaveProperty('ok')
      setTimeout(done, 50)
    })
  })

  test('GunStorageProxy login users', async done => {
    db.login('bob', 'test123', err => {
      expect(err).toHaveProperty('ok')
      done()
    })
  })

  test('GunStorageProxy set get', async done => {
    await db.set('test', { key: '123' })
    const val = await db.get('test')
    expect(val).toMatchObject({ key: '123' })
    done()
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })
})

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}
