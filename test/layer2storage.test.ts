import { GunStorageProxy } from '../src/layer2storage'
import Gun from 'gun'
require('gun/lib/then.js')

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
})
