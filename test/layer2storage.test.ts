import { GunStorageProxy, makeLCState, LCState } from '../src/layer2storage'
process.env.GUN_ENV = 'false'
import Gun from 'gun'
require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')
/**
 * Dummy test
 */
describe('Dummy test', () => {
  let db: GunStorageProxy = null
  let y: any

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
    const l: LCState = makeLCState('id1', 'nonce1', 'party', 'cparty', 'sig', 'root', '12', '5')
    const lclone = clone(l)

    await db.storeLC(l)
    //console.log('stored', )
    const val = await db.getLC(lclone.id)
    expect(val).toMatchObject(lclone)

    y = val

    const lcs = await db.getLCs()

    expect(lcs.length).toEqual(1)
    expect(lcs[0]).toMatchObject(lclone)

    db.getLCsMap((lc: any) => {
      expect(lc).toMatchObject(lclone)
      done()
    })
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })

  it('GunStorageProxy del LC', async (done: any) => {
    await db.delLC(y.id)
    done()
  })

  it('GunStorageProxy check if LC deleted by getLC', async (done: any) => {
    const val = await db.getLC(y.id)
    expect(val).toBeNull()
    done()
  })

  it('GunStorageProxy check if LC deleted by getLCs', async (done: any) => {
    const lcs = await db.getLCs()
    expect(lcs.length).toEqual(0)
    done()
  })
})

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}
