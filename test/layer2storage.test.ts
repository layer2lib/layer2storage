import { GunStorageProxy, makeLCState, LCState } from '../src/layer2storage'
import Gun from 'gun'
require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')

process.env.GUN_ENV = 'false'
/**
 * Dummy test
 */
describe('Dummy test', () => {
  let db: GunStorageProxy = null

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

  it('GunStorageProxy storeLC getLC getLCs', async () => {
    const l: LCState = makeLCState('id1', 'nonce1', 'party', 'cparty', 'sig', 'root', '12', '5')
    const lclone = clone(l)

    await db.storeLC(l)
    //console.log('stored', )
    const val = await db.getLC(lclone.id)
    expect(val).toMatchObject(lclone)

    await db.getLCs().then((lcs: any) => {
      expect(lcs).toEqual(1)
      expect(lcs[0]).toMatchObject(lclone)
    })
    //expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })
})

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}
