import * as Gun from 'gun'
import { GunStorageProxy, LCState, VCState, Sig } from '../src/layer2storage'
require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')
require('gun/lib/load.js')
require('gun/lib/not.js')
require('gun/lib/path.js')

process.env.GUN_ENV = 'false'
/**
 * Dummy test
 */
jest.setTimeout(1200)
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
  })

  test('GunStorageProxy is instantiable', () => {
    const gun = Gun({ localStorage: true, radisk: false })
    db = new GunStorageProxy(gun, 'lauren')
    expect(db.dbprefix).toEqual('lauren')
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  test('GunStorageProxy set get', async () => {
    await db.set('test', { key: '123' })
    const val = await db.get('test')
    expect(val).toMatchObject({ key: '123' })
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  test('GunStorageProxy check cleared local storage', async (done: any) => {
    const noLC = await db.getLC(led.id)
    expect(noLC).toBeNull()
    done()
  })

  test('GunStorageProxy storeLC', async (done: any) => {
    const lclone = clone(led)
    const lclone2 = clone(led2)

    expect(lclone.id).toEqual('id')
    expect(lclone2.id).toEqual('id1234')

    const r = await db.storeLC(lclone)
    const r2 = await db.storeLC(lclone2)

    expect(r).toMatchObject(led)
    expect(r2).toMatchObject(led2)
    done()
  })

  test('GunStorageProxy getLC', async (done: any) => {
    const val = await db.getLC(led2.id)
    expect(val).toMatchObject(led2)

    const val2 = await db.getLC(led.id)
    expect(val2).toMatchObject(led)

    done()
  })

  test('GunStorageProxy getLCs', async (done: any) => {
    expect.assertions(2)

    const mockCallback = jest.fn()
    let called = 0
    db.getLCs(lc => {
      called++
      //expect(called).toBe(2)
      if (called == 1) expect(lc).toMatchObject(led)
      if (called == 2) {
        expect(lc).toMatchObject(led2)
        done()
      }
    })
  })

  test('GunStorageProxy getLCsList', async (done: any) => {
    const r = await db.getLCsList()
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject(led)
    expect(r[1]).toMatchObject(led2)
    done()
  })

  test('GunStorageProxy getLCbyNonce 0', async (done: any) => {
    const val = await db.getLCbyNonce(led.id, chan.nonce)
    expect(val).toMatchObject(led)

    done()
  })

  test('GunStorageProxy getLCStateCount', async (done: any) => {
    const nonce = await db.getLCStateCount(led.id)
    expect(nonce).toEqual(0)
    done()
  })

  test('GunStorageProxy updateLC', async (done: any) => {
    const val = clone(led) // await db.getLC(led.id)
    val.isClosed = true
    val.nonce = led.nonce + 1
    await db.updateLC(val)

    const uval = await db.getLC(led.id)
    expect(uval).not.toMatchObject(led)
    expect(uval).toMatchObject(val)
    done()
  })

  test('GunStorageProxy updateLC throw', async (done: any) => {
    const c = clone(led)
    c.id = 'badid'
    try {
      await db.updateLC(c)
    } catch (e) {
      done()
    }
  })

  test('GunStorageProxy post-lc-update getLCbyNonce 0, 1', async (done: any) => {
    const pos = await db.getLCbyNonce(led.id, chan.nonce)
    expect(pos).toMatchObject(led)

    const val2 = clone(led)
    val2.isClosed = true
    val2.nonce = led.nonce + 1

    const pos2 = await db.getLCbyNonce(led.id, chan.nonce + 1)
    expect(pos2).toMatchObject(val2)

    done()
  })

  test('GunStorageProxy post-lc-update getLCStateCount', async (done: any) => {
    const nonce = await db.getLCStateCount(led.id)
    expect(nonce).toEqual(chan.nonce + 1)
    done()
  })

  test('GunStorageProxy getVChannelElder', async (done: any) => {
    const val = clone(led)
    val.isClosed = true
    val.nonce = led.nonce + 1

    const uval = await db.getLCElder(led.id)
    expect(uval).not.toMatchObject(val)
    expect(uval).toMatchObject(led)
    done()
  })

  // ===== channels test
  // TODO: UPDATE STATE

  test('GunStorageProxy storeVChannel', async (done: any) => {
    const vcclone = clone(chan)

    const v = await db.storeVChannel(vcclone)
    expect(v).toMatchObject(chan)

    //const val = await db.getVChannel(chan.id)
    // expect(val).toMatchObject(chan)

    /*
    const vcclone2 = clone(chan)
    vcclone2.id = '111'
    await db.storeVChannel(vcclone2) // aaa
    */

    done()
  })

  test('GunStorageProxy getVChannel', async (done: any) => {
    const val = await db.getVChannel(chan.id)
    expect(val).toMatchObject(chan)

    done()
  })

  test('GunStorageProxy getVChannelbyNonce 0', async (done: any) => {
    const val = await db.getVChannelbyNonce(chan.id, chan.nonce)
    expect(val).toMatchObject(chan)

    done()
  })

  test('GunStorageProxy storeVChannel throw', async (done: any) => {
    const vcclone = clone(chan)
    vcclone.lcId = 'badid'

    try {
      await db.storeVChannel(vcclone)
    } catch (e) {
      done()
    }
  })

  test('GunStorageProxy getVChannels', async (done: any) => {
    let len = 0
    db.getVChannels(led.id, (c: any) => {
      len++
      expect(len).toEqual(1)
      expect(c).toMatchObject(chan)
      done()
    })
  })

  test('GunStorageProxy getAllVChannels', async (done: any) => {
    let len = 0
    db.getAllVChannels((c: any) => {
      len++
      expect(len).toEqual(1)
      expect(c).toMatchObject(chan)
      done()
    })
  })

  test('GunStorageProxy getVChannelsList', async (done: any) => {
    const list = await db.getVChannelsList(led.id)
    // console.log(list, typeof list, list.length)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject(chan)
    done()
  })

  test('GunStorageProxy getAllVChannelsList', async (done: any) => {
    const allList = await db.getAllVChannelsList()
    expect(allList).toHaveLength(1)
    expect(allList[0]).toMatchObject(chan)

    done()
  })

  test('GunStorageProxy getVChannelStateCount', async (done: any) => {
    const nonce = await db.getVChannelStateCount(chan.id)
    expect(nonce).toEqual(chan.nonce)
    done()
  })

  test('GunStorageProxy updateVChannel', async (done: any) => {
    //const val = await db.getVChannel(chan.id)
    //expect(val).toMatchObject(chan)
    const val = clone(chan)
    val.isClosed = true
    val.nonce = chan.nonce + 1
    await db.updateVChannel(val)

    const uval = await db.getVChannel(chan.id)
    expect(uval).not.toMatchObject(chan)
    expect(uval).toMatchObject(val)
    done()
  })

  test('GunStorageProxy getVChannelElder', async (done: any) => {
    //const val = await db.getVChannel(chan.id)
    //expect(val).toMatchObject(chan)
    const val = clone(chan)
    val.isClosed = true
    val.nonce = chan.nonce + 1

    const uval = await db.getVChannelElder(chan.id)
    expect(uval).not.toMatchObject(val)
    expect(uval).toMatchObject(chan)
    done()
  })

  test('GunStorageProxy updateVChannel getVChannelStateCount', async (done: any) => {
    const nonce = await db.getVChannelStateCount(chan.id)

    expect(nonce).toEqual(chan.nonce + 1)
    done()
  })

  test('GunStorageProxy getVChannelbyNonce after update', async (done: any) => {
    const result1 = await db.getVChannelbyNonce(chan.id, 0)
    expect(result1).toMatchObject(chan)

    const val = await db.getVChannel(chan.id)
    const result2 = await db.getVChannelbyNonce(chan.id, 1)
    expect(result2).toMatchObject(val)

    done()
  })

  test('GunStorageProxy updateVChannel throw', async (done: any) => {
    const c = clone(chan)
    c.id = 'badid'
    try {
      await db.updateVChannel(c)
    } catch (e) {
      done()
    }
  })

  test('GunStorageProxy del vchannel', async (done: any) => {
    await db.delVChannel(chan.id)
    done()
  })

  test('GunStorageProxy post-vc-delete getVChannel', async (done: any) => {
    const val = await db.getVChannel(chan.id)
    expect(val).toBeNull()
    done()
  })

  // TODO: could take out this check in favor of list
  /*test('GunStorageProxy post-vc-delete getVChannels', async (done: any) => {
    let len = 0
    db.getVChannels(led.id, (c: any) => {
      len++
    })
    setTimeout(() => {
      expect(len).toEqual(0)
      done()
    }, 200)
  })*/

  test('GunStorageProxy post-vc-delete getVChannelsList', async (done: any) => {
    const list = await db.getVChannelsList(led.id)
    // console.log(list, typeof list, list.length)
    expect(list).toHaveLength(0)
    done()
  })

  // =============

  test('GunStorageProxy del LC', async (done: any) => {
    await db.delLC(led.id)
    await db.delLC(led2.id)
    done()
  })

  test('GunStorageProxy post-lc-delete getLC', async (done: any) => {
    const val = await db.getLC(led.id)
    expect(val).toBeNull()
    done()
  })

  test('GunStorageProxy post-lc-delete getLCs', async (done: any) => {
    const mockCallback = jest.fn()
    db.getLCs(mockCallback)

    setTimeout(() => {
      expect(mockCallback.mock.calls.length).toBe(0)
      done()
    }, 100)

    /*const lcs = await db.getLCs()
    expect(lcs.length).toEqual(0)
    done()*/
  })

  test('GunStorageProxy close', async (done: any) => {
    db.disconnect()
    db = null
    done()
  })
})

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}
