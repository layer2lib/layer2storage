require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')
require('gun/lib/load.js')
require('gun/lib/not.js')
// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...
type StrObject = { [key: string]: string }
type BigNumber = any

type VCID = string
type LCID = string
type Address = string

/*
interface PartyKey {
  id: Address
  pubkey: string
}
*/

export interface Sig {
  message: string
  messageHash: string
  v: string
  r: string
  s: string
  signature: string
}

export interface State {
  id: string
  isClosed: boolean
  nonce: string
  party: Address
  counterparty: Address
  stateHash: string
  sig: Sig
  sig_counterpary?: Sig
}
/*
interface Balances {
  balanceA: BigNumber
  balanceB: BigNumber
}
*/
export interface LCState extends State {
  openVCs: number
  vcRootHash: string
  balanceA: BigNumber
  balanceB: BigNumber
}

export interface VCState extends State {
  lcId: string
  balanceA: BigNumber
  balanceB: BigNumber
  appState: StrObject | null // challenger?: address;
}

/*
interface PaymentState extends LCState {
  sender: Address
  balance: string
}
*/
export interface L2Database {
  logdriver(): void
  set(k: string, v: any): void // for misc data
  get(k: string): any

  storeLC(data: LCState): Promise<LCState>
  updateLC(data: LCState): Promise<LCState> // replace if same nonce
  getLC(ledgerID: LCID): Promise<LCState> // latest by nonce
  //getLCs(): Promise<LCState[]> // latest by nonce
  getLCs(cb: (lc: LCState) => void): void // TODO replace above
  getLCsList(): Promise<LCState[]>

  delLC(id: LCID): Promise<void>

  storeVChannel(data: VCState): Promise<VCState>
  delVChannel(chan: VCID): Promise<void>
  // replace if same nonce
  updateVChannel(data: VCState): Promise<VCState>
  getVChannel(ledger: VCID): Promise<VCState> // latest by nonce

  getVChannels(ledger: LCID, cb: (lc: VCState) => void): void // latest by nonce
  getVChannelsList(ledger: LCID): Promise<VCState[]>
  getAllVChannels(cb: (lc: VCState) => void): void
  getAllVChannelsList(): Promise<VCState[]>
}

type Gun = any
const LC_VCHANNELS_KEY = 'vchannels'
const VC_LEDGER_KEY = 'ledger'
export class GunStorageProxy implements L2Database {
  private dbKeys: { [key: string]: boolean } = {}
  private prefix: string = ''
  private gun: any

  private _lcs: any
  private _lc: any

  private _vc: any
  private _vcs: any
  constructor(gun: Gun, prefix: string = 'layer2') {
    // super()
    if (!gun) throw new Error('Gun instance missing from constructor')
    this.gun = gun
    this.prefix = prefix

    this._lc = this._db.get('ledger')
    this._lcs = this._db.get('ledgers')

    this._vc = this._db.get('vchannel')
    this._vcs = this._db.get('vchannels')
  }
  logdriver() {
    // Log out current engine
    console.log('js-layer2lib using gun driver')
  }
  private get _db() {
    return this.gun.get(this.prefix)
  }
  private _ledgerByID(ledgerID: string) {
    return this._lc.get(ledgerID)
  }
  private _vchanByID(chan: string) {
    return this._vc.get(chan)
  }
  /*private get _lcs() {
    return this._db.get('ledgers')
  }*/
  async set(k: string, v: StrObject) {
    if (!k) throw new Error('key cannot be null or empty')
    if (!v) throw new Error('value cannot be null or empty')
    // wthis.dbKeys[k] = true
    await this._db.get(k).put(v)
  }
  async get(k: string) {
    let res = await this._db.get(k).once()
    return res
  }
  async keys() {
    return Object.keys(this.dbKeys)
  }

  async storeLC(data: LCState): Promise<LCState> {
    if (!data.id) throw new Error('no id given')

    // only save the latest nonce
    //const old = await this._ledgerByID(data.id).once()
    //if (!!old && old.nonce > data.nonce) return Promise.resolve(data)

    const l = this._ledgerByID(data.id).put(data)
    //.then((sdata: LCState) => sdata)
    //const c =
    await this._lcs.set(l)
    // console.log('c', c)
    return await l
    // return Promise.resolve(data)
  }
  // replace if same nonce
  async updateLC(data: LCState): Promise<LCState> {
    if (!data.id) throw new Error('no id given')
    // optimize away?
    console.log('data.id', data.id)
    const lc = this._ledgerByID(data.id)
    const stored = await lc.not()
    if (!stored) throw new Error('ledger id was not stored previously')

    return lc
      .put(data)
      .once()
      .then((sdata: LCState) => sdata)
  }
  // latest by nonce
  async getLC(ledgerID: LCID): Promise<LCState> {
    if (!ledgerID) throw new Error('no id given')
    return this._ledgerByID(ledgerID).load()
  }

  // latest by nonce
  /*
  async getLCs(): Promise<LCState[]> {
    // going to hell for this but it must be done like this (for now)..
    // .. must use timeout to aggregate the collection until
    // .. gun supports length tracked lists
    // TODO: store a length param as a seperate key with some atomic-like
    const timeout = (ms: number) => new Promise(res => setTimeout(res, ms))
    let lcs: LCState[] = []
    this._lcs
      .once()
      .map()
      .once((x: any) => {
        // console.log('x', x)
        if (!!x) lcs.push(x)
      })

    return timeout(850).then((x: any) => lcs)
  }
  */

  getLCs(cb: (lc: LCState) => void): void {
    this._lcs
      .once()
      .map()
      .once((x: any) => {
        if (!!x) cb(x)
      })
  }

  async delLC(id: LCID): Promise<void> {
    if (!id) throw new Error('no id given')
    if (!!(<any>id).id) throw new Error('object was given instead of id')

    const l = this._ledgerByID(id).once()
    if (!l) throw new Error('lenger ' + id + ' does not exist to delete')
    await this._lcs.unset(l)
    return l.put(null)
  }

  async storeVChannel(data: VCState): Promise<VCState> {
    const id = data.id
    const lcId = data.lcId
    if (!id) throw new Error('no id given')
    if (!lcId) throw new Error('no lcId given')

    if (!data.appState) data.appState = null //fixes bug

    const lc = this._ledgerByID(lcId)
    if (!(await lc.not())) throw new Error('no ledger matching ' + lcId)

    // only save the latest nonce
    //const old = await this._vchanByID(id).once()
    //if (old && old.nonce > data.nonce) return Promise.resolve(data)

    // create VC in db and put it in the set
    const vc = this._vchanByID(id).put(data)

    // await vc.once() // TODO may not be needed

    await this._vcs.set(vc)
    // link ledger to channel
    await vc.get(VC_LEDGER_KEY).put(lc)
    // add channel to ledger
    await lc.get(LC_VCHANNELS_KEY).set(vc)

    // FOR TESTING TODO: REMOVE
    /*await lc
      .get(LC_VCHANNELS_KEY)
      .map()
      .once((x: any) => {
        console.log(x)
      })*/

    return vc
  }
  async delVChannel(id: VCID): Promise<void> {
    if (!id) throw new Error('no id given')
    if (!!(<any>id).id) throw new Error('object was given instead of id')

    const vc = this._vchanByID(id)
    //const vcc = await vc.not()
    //if (!vcc) throw new Error('vc ' + id + ' does not exist to delete')
    await this._vcs.unset(vc)

    // console.log('delVChannel', vcc, !!vcc.ledger)
    //if (vcc.ledger) {
    await vc
      .get(VC_LEDGER_KEY)
      .get(LC_VCHANNELS_KEY)
      .unset(vc)
    //}

    return vc.put(null)
  }
  // replace if same nonce
  async updateVChannel(data: VCState): Promise<VCState> {
    const id = data.id
    if (!id) throw new Error('no channel id given')
    // optimize away?
    const lc = this._vchanByID(id)
    const stored = !!(await lc.not())
    if (!stored) throw new Error('vchan id was not stored previously')

    return lc
      .put(data)
      .once()
      .then((sdata: VCState) => sdata)
  }
  // latest by nonce
  async getVChannel(id: VCID): Promise<VCState> {
    if (!id) throw new Error('no id given')
    return this._vchanByID(id).load()
    // return Promise.resolve({} as VCState)
  }
  // latest by nonce
  getVChannels(ledger: LCID, cb: (lc: VCState) => void): void {
    const lc = this._ledgerByID(ledger)
    //if (!(await lc)) throw new Error('no ledger matching ' + ledger)
    return lc
      .get(LC_VCHANNELS_KEY)
      .once()
      .map()
      .once((x: any) => {
        if (x) cb(x)
        return x
      })

    // return Promise.resolve([] as VCState[])
  }
  getAllVChannels(cb: (lc: VCState) => void): void {
    return this._vcs
      .once() // bug
      .map()
      .once((x: any) => {
        if (x) cb(x)
        return x
      })
  }

  async getLCsList(): Promise<LCState[]> {
    const listPromise = this._lcs.once()
    return _listify(listPromise)
  }

  async getVChannelsList(ledger: LCID): Promise<VCState[]> {
    const listPromise = this._ledgerByID(ledger)
      .get(LC_VCHANNELS_KEY)
      .once()
    return _listify(listPromise)
  }

  async getAllVChannelsList(): Promise<VCState[]> {
    const listPromise = this._vcs.once()
    return _listify(listPromise)
  }
}

async function _listify(gunkey: any): Promise<any[]> {
  const listPromise = gunkey.once()
  const listVal = await listPromise
  const len = Object.keys(listVal).length - 1
  // console.log('len', a, len)
  let count = 0
  const total: any[] = []
  const p = new Promise<any[]>((resolve, rejected) => {
    listPromise.map().once((x: LCState, index: string) => {
      if (!listVal[index]) {
        console.log('discarding new entry')
        return
      }
      count++
      if (!!x) total.push(x)
      if (count == len) resolve(total)
    })
  })
  return p
}
/*
(x: any) => {
        //console.log('yyyyyyyyyy', x)
        if (!!x) cb(x)
        return x
      }
      */

/*
      .map((x: any) => {
        //console.log('xxxxxxxxxxxx', x)
        if (!!x) cb(x)
        return x
      })
      */
