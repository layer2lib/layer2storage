import { GunStorageProxy, LCState, VCState, Sig } from '../src/layer2storage'
process.env.GUN_ENV = 'false'
import Gun from 'gun'

/**
 * Dummy test
 */
jest.setTimeout(1000)
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
    nonce: '1',
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

  const chan: VCState = {
    id: 'id2',
    nonce: 'n',
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

  //let led: any
  //let chan: any

  test('works if true is truthy', () => {
    expect(true).toBeTruthy()
  })

  test('GunStorageProxy is instantiable', () => {
    const gun = new Gun({ radisk: false, localStorage: true })
    db = new GunStorageProxy(gun)
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  test('GunStorageProxy set get', async () => {
    await db.set('test', { key: '123' })
    const val = await db.get('test')
    expect(val).toMatchObject({ key: '123' })
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  test('GunStorageProxy storeLC getLC getLCs', async (done: any) => {
    expect.assertions(4)

    const lclone = clone(led)
    const lclone2 = clone(led2)

    const r = await db.storeLC(lclone)
    await db.storeLC(lclone2)

    expect(r).toMatchObject(led)

    const val = await db.getLC(lclone.id)
    expect(val).toMatchObject(led)

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

    /*setTimeout(() => {
      expect(mockCallback.mock.calls.length).toBe(1)
      expect(mockCallback.mock.calls[0][0]).toMatchObject(lclone)
      done()
    }, 200)*/
  })

  test('GunStorageProxy getLCsList', async (done: any) => {
    const r = await db.getLCsList()
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject(led)
    expect(r[1]).toMatchObject(led2)
    done()
  })

  test('GunStorageProxy updateLC', async (done: any) => {
    const val = await db.getLC(led.id)
    val.party = 'new party'
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

  // ===== channels test
  // TODO: UPDATE STATE

  test('GunStorageProxy storeVChannel getVChannel', async (done: any) => {
    const vcclone = clone(chan)

    const v = await db.storeVChannel(vcclone)
    expect(v).toMatchObject(chan)

    const val = await db.getVChannel(chan.id)
    expect(val).toMatchObject(chan)

    /*
    const vcclone2 = clone(chan)
    vcclone2.id = '111'
    await db.storeVChannel(vcclone2) // aaa
    */

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

  test('GunStorageProxy getVChannelsList getAllVChannelsList', async (done: any) => {
    const chanList = await db.getVChannelsList(led.id)
    expect(chanList).toHaveLength(1)
    expect(chanList[0]).toMatchObject(chan)

    const allList = await db.getAllVChannelsList()
    expect(allList).toHaveLength(1)
    expect(allList[0]).toMatchObject(chan)

    done()
  })

  test('GunStorageProxy updateVChannel', async (done: any) => {
    const val = await db.getVChannel(chan.id)
    expect(val).toMatchObject(chan)
    val.party = 'new party'
    await db.updateVChannel(val)

    const uval = await db.getVChannel(chan.id)
    expect(uval).not.toMatchObject(chan)
    expect(uval).toMatchObject(val)
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

  test('GunStorageProxy check if chan deleted by getVChannel', async (done: any) => {
    const val = await db.getVChannel(chan.id)
    expect(val).toBeNull()
    done()
  })

  test('GunStorageProxy check if chan deleted by getVChannels', async (done: any) => {
    let len = 0
    db.getVChannels(led.id + 'a', (c: any) => {
      len++
    })
    setTimeout(() => {
      expect(len).toBe(0)
      done()
    }, 200)
  })

  // =============

  test('GunStorageProxy del LC', async (done: any) => {
    await db.delLC(led.id)
    await db.delLC(led2.id)
    done()
  })

  test('GunStorageProxy check if LC deleted by getLC', async (done: any) => {
    const val = await db.getLC(led.id)
    expect(val).toBeNull()
    done()
  })

  test('GunStorageProxy check if LC deleted by getLCs', async (done: any) => {
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
})

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}
