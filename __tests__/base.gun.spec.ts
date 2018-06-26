import { GunStorageProxy, makeLCState, LCState, VCState, makeVCState } from '../src/layer2storage'
process.env.GUN_ENV = 'false'
import Gun from 'gun'
require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')
//require('gun/lib/not.js')
/**
 * Dummy test
 */
jest.setTimeout(1000)
describe('Dummy test', () => {
  let db: GunStorageProxy = null
  const led: LCState = makeLCState('id1', 'nonce1', 'party', 'cparty', 'sig', 'root', '12', '5')
  const chan: VCState = makeVCState(
    'vcid1',
    'nonce',
    'partyA',
    'counterp',
    'sig',
    led.id,
    'bala',
    'balb'
  )

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
    // expect.assertions(3)

    const lclone = clone(led)

    await db.storeLC(lclone)
    //console.log('stored', )
    const val = await db.getLC(lclone.id)
    expect(val).toMatchObject(lclone)

    const mockCallback = jest.fn()
    let called = false
    db.getLCs(lc => {
      expect(called).toBe(false)
      called = true
      expect(lc).toMatchObject(lclone)
      done()
    })

    /*setTimeout(() => {
      expect(mockCallback.mock.calls.length).toBe(1)
      expect(mockCallback.mock.calls[0][0]).toMatchObject(lclone)
      done()
    }, 200)*/
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

  // ===== channels test
  // TODO: UPDATE STATE

  test('GunStorageProxy storeVChannel getVChannel', async (done: any) => {
    const vcclone = clone(chan)

    await db.storeVChannel(vcclone)

    const val = await db.getVChannel(chan.id)
    expect(val).toMatchObject(chan)

    /*
    const vcclone2 = clone(chan)
    vcclone2.id = '111'
    await db.storeVChannel(vcclone2) // aaa
    */

    done()
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
