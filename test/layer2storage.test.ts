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
  let led: any
  let chan: any

  it('works if true is truthy', () => {
    expect(true).toBeTruthy()
  })

  it('GunStorageProxy is instantiable', () => {
    const gun = new Gun()
    db = new GunStorageProxy(gun)
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  it('GunStorageProxy set get', async () => {
    await db.set('test', { key: '123' })
    const val = await db.get('test')
    expect(val).toMatchObject({ key: '123' })
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  it('GunStorageProxy storeLC getLC getLCs', async (done: any) => {
    // expect.assertions(3)
    const l: LCState = makeLCState('id1', 'nonce1', 'party', 'cparty', 'sig', 'root', '12', '5')
    const lclone = clone(l)

    await db.storeLC(l)
    //console.log('stored', )
    const val = await db.getLC(lclone.id)
    expect(val).toMatchObject(lclone)

    led = val

    const mockCallback = jest.fn()
    let called = false
    db.getLCsMap(lc => {
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

  // ===== channels test
  // TODO: UPDATE STATE

  it('GunStorageProxy storeVChannel getVChannel', async (done: any) => {
    const vc: VCState = makeVCState(
      'vcid1',
      'nonce',
      'partyA',
      'counterp',
      'sig',
      led.id,
      'bala',
      'balb'
    )
    const vcclone = clone(vc)

    await db.storeVChannel(vc)

    const val = await db.getVChannel(vc.id)
    expect(val).toMatchObject(vcclone)

    chan = vcclone
    done()
  })

  it('GunStorageProxy getVChannels', async (done: any) => {
    db.getVChannels(led.id, (c: any) => {
      expect(c).toMatchObject(chan)
      done()
    })
  })

  it('GunStorageProxy getAllVChannels', (done: any) => {
    db.getAllVChannels((c: any) => {
      expect(c).toMatchObject(chan)
      done()
    })
  })

  it('GunStorageProxy del vchannel', async (done: any) => {
    await db.delVChannel(chan.id)
    done()
  })

  it('GunStorageProxy check if chan deleted by getVChannel', async (done: any) => {
    const val = await db.getVChannel(chan.id)
    expect(val).toBeNull()
    done()
  })

  it('GunStorageProxy check if chan deleted by getVChannels', (done: any) => {
    let id = -1
    let len = 0
    db.getVChannels(led.id, (c: any) => {
      id = c.id
      len++
    })
    setTimeout(() => {
      expect(id).not.toBe(chan.id)
      expect(len).toBe(0)
      done()
    }, 100)
  })

  // =============

  it('GunStorageProxy del LC', async (done: any) => {
    await db.delLC(led.id)
    done()
  })

  it('GunStorageProxy check if LC deleted by getLC', async (done: any) => {
    const val = await db.getLC(led.id)
    expect(val).toBeNull()
    done()
  })

  it('GunStorageProxy check if LC deleted by getLCsMap', async (done: any) => {
    const mockCallback = jest.fn()
    db.getLCsMap(mockCallback)

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
