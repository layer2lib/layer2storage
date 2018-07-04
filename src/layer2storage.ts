require('gun/lib/then.js')
require('gun/lib/unset.js')
require('gun/lib/open.js')
require('gun/lib/load.js')
require('gun/lib/not.js')
require('gun/lib/path.js')
// import 'gun-synclist'
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
  nonce: number
  party: Address
  counterparty: Address
  stateHash: string
  sig: Sig
  sig_counterparty?: Sig
}

// stringify subobjects
const complexKeys = ['sig', 'sig_counterparty']
function unpack(o: any): any {
  if (!o) return null
  complexKeys.forEach((k: string) => {
    if (o[k] && isString(o[k])) o[k] = JSON.parse(o[k])
  })

  delete o['_'] // remove gundb meta data
  return o
}
function pack(o: any): any {
  if (!o) return o
  o = clone(o)
  delete (o as any)['_'] // prevent recycled gun nodes
  complexKeys.forEach((k: string) => {
    if (o[k] && !isString(o[k])) o[k] = JSON.stringify(o[k])
  })
  return o
}
function isString(x: any): boolean {
  return Object.prototype.toString.call(x) === '[object String]'
}
// =====
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
  getLCElder(id: LCID): Promise<LCState | null>

  getLCbyNonce(id: LCID, seq: number): Promise<LCState | null>
  getLCs(cb: (lc: LCState) => void): void // TODO replace above
  getLCsList(): Promise<LCState[]>

  delLC(id: LCID): Promise<void>

  storeVChannel(data: VCState): Promise<VCState>
  delVChannel(chan: VCID): Promise<void>
  // replace if same nonce
  updateVChannel(data: VCState): Promise<VCState>
  getVChannel(id: VCID): Promise<VCState | null> // latest by nonce
  getVChannelElder(id: VCID): Promise<VCState | null> // latest by nonce
  getVChannelbyNonce(id: VCID, seq: number): Promise<VCState | null>

  getVChannels(ledger: LCID, cb: (lc: VCState) => void): void // latest by nonce
  getVChannelsList(ledger: LCID): Promise<VCState[]>
  getAllVChannels(cb: (lc: VCState) => void): void
  getAllVChannelsList(): Promise<VCState[]>

  getVChannelStateCount(id: string): Promise<number>
  getLCStateCount(id: string): Promise<number>
}

//==============================
interface Node<T> {
  head: T | null
  prevHead: T | null
  tail: T | null
  ledger: any | null
  // vchannels: any[] | null, // todo: not sure if saving a list like this works
  table: { [key: string]: T }
}

type Gun = any
const LC_VCHANNELS_KEY = 'vchannels'
const VC_LEDGER_KEY = 'ledger'
const NODE_HEAD = 'head'
const NODE_HEAD_PREV = 'prevHead'
const NODE_TABLE = 'table'
const NODE_TAIL = 'tail'
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
    // this._vcs = this._db.get('vchannels')
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
    const id = data.id
    if (!id) throw new Error('no id given')

    let node = this._ledgerByID(id)
    if (!!(await node.not())) throw new Error('ledger already exists ' + id)

    data = pack(data)

    const nodeObj: Node<LCState> = {
      head: null,
      prevHead: null,
      ledger: null,
      tail: null, // will set below
      table: { [data.nonce]: data } // dont populate yet
    }

    node = node.put(nodeObj)

    // update the vc table
    const lc = node.get(NODE_TABLE).get(data.nonce)

    // create VC in db and put it in the set
    await node.get(NODE_HEAD).put(lc)

    // update the vc tail
    await node.get(NODE_TAIL).put(lc)

    // not in Node type yet, list of VCs
    await node.get(LC_VCHANNELS_KEY).set(null)

    // not needed but this is the spirit
    // lc.get('next').put(null)
    await this._lcs.set(node)

    return lc.then(unpack)
  }

  /*async storeLC2(data: LCState): Promise<LCState> {
    if (!data.id) throw new Error('no id given')

    data = pack(data)

    const l = this._ledgerByID(data.id).put(data)
    //.then((sdata: LCState) => sdata)
    //const c =
    await this._lcs.set(l)
    // console.log('c', c)
    return await l.then(unpack)
    // return Promise.resolve(data)
  }*/
  // replace if same nonce
  async updateLC(data: LCState): Promise<LCState> {
    if (!data.id) throw new Error('no id given')
    // optimize away?
    const node = this._ledgerByID(data.id)
    const oldHead = node.get(NODE_HEAD)
    if (!(await oldHead.not())) throw new Error('ledger id was not stored previously')

    if (oldHead.nonce > data.nonce) return data

    data = pack(data)

    await node.get(NODE_HEAD_PREV).put(oldHead)

    // update hash table
    const newVC = node
      .get(NODE_TABLE)
      .get(data.nonce)
      .put(data)

    await node.get(NODE_HEAD).put(newVC)

    return newVC.once().then(unpack)
  }
  // latest by nonce
  async getLC(ledgerID: LCID): Promise<LCState> {
    if (!ledgerID) throw new Error('no id given')
    return this._ledgerByID(ledgerID)
      .path(NODE_HEAD)
      .not() // .load()
      .then(unpack)
  }

  async getLCElder(ledgerID: LCID): Promise<LCState | null> {
    if (!ledgerID) throw new Error('no id given')
    return this._ledgerByID(ledgerID)
      .path(NODE_HEAD_PREV)
      .not() // .load()
      .then(unpack)
  }

  async getLCbyNonce(id: LCID, seq: number): Promise<LCState | null> {
    return this._ledgerByID(id)
      .path([NODE_TABLE, seq])
      .not()
      .then(unpack)
  }

  /*
  async getLCbySequence(ledgerID: LCID, seq: number): Promise<LCState> {
    if (!ledgerID) throw new Error('no id given')
    if (!Number.isInteger(seq)) throw new Error('seq not valid integer')
    //return Promise.resolve<LCState>(null as any)
  }
  */

  getLCs(cb: (lc: LCState) => void): void {
    this._lcs
      .once()
      .map()
      .path(NODE_HEAD)
      .once((x: any) => {
        unpack(x)
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

    const lcNode = this._ledgerByID(lcId)
    if (!(await lcNode.not())) throw new Error('no ledger matching ' + lcId)

    // only save the latest nonce
    //const old = await this._vchanByID(id).once()
    //if (old && old.nonce > data.nonce) return Promise.resolve(data)

    data = pack(data)

    const nodeObj: Node<VCState> = {
      head: null,
      prevHead: null,
      ledger: null,
      tail: null, // will set below
      table: { [data.nonce]: data } // dont populate yet
    }

    const node = this._vchanByID(id).put(nodeObj)
    //await node.once()

    // update the vc table
    const vc = node.get(NODE_TABLE).get(data.nonce)

    // create VC in db and put it in the set
    await node.get(NODE_HEAD).put(vc)

    // update the vc tail
    await node.get(NODE_TAIL).put(vc)

    // await vc.once() // TODO may not be needed

    ////await this._vcs.set(vc)
    // link ledger to channel
    await node.get(VC_LEDGER_KEY).put(lcNode)
    // add channel to ledger
    await lcNode.get(LC_VCHANNELS_KEY).set(node)

    // not needed but this is the spirit
    lcNode.get('next').put(null)

    return vc.then(unpack)
  }

  async delVChannel(id: VCID): Promise<void> {
    if (!id) throw new Error('no id given')
    if (!!(<any>id).id) throw new Error('object was given instead of id')

    const node = this._vchanByID(id)

    // check if it was saved
    const vcc = await node.not()
    if (!vcc) throw new Error('vc ' + id + ' does not exist to delete')

    ////await this._vcs.unset(vc)

    // console.log('delVChannel', vcc, !!vcc.ledger)
    //if (vcc.ledger) {

    await node.get(NODE_HEAD).put(null)

    // Remove myself from my LC's list of VCs
    await node
      .get(VC_LEDGER_KEY) // get ledger
      .get(LC_VCHANNELS_KEY) // get ledger's list of vc
      .unset(node) // remove this node
    //}

    return node.put(null)
  }
  // replace if same nonce
  async updateVChannel(data: VCState): Promise<VCState> {
    const id = data.id
    if (!id) throw new Error('no channel id given')

    const node = this._vchanByID(id)

    const oldHead = node.get(NODE_HEAD)
    const stored = await oldHead.not()
    if (!stored) throw new Error('vchan id was not stored previously')

    if (stored.nonce > data.nonce) throw new Error('nonce out of order')

    data = pack(data)

    // update prev head key
    await node
      .get(NODE_HEAD_PREV)
      .put(null)
      .put(oldHead)

    // update hash table
    const newVC = node
      .get(NODE_TABLE)
      .get(data.nonce)
      .put(data)

    // update head, ensure ref is not merged
    // await node.get(NODE_HEAD).put(null) // TODO

    await node.get(NODE_HEAD).put(newVC)

    // link old to new
    //await node
    //  .get(NODE_HEAD_PREV)
    //  .get('next')
    //  .put(newVC)

    return newVC.once().then(unpack)
  }
  // latest by nonce
  async getVChannel(id: VCID): Promise<VCState | null> {
    if (!id) throw new Error('no id given')

    // TODO: slow to double check if key exist
    // required when key does not exist and hangs
    const exists = await this._vchanByID(id).not()
    if (!exists) return null

    return this._vchanByID(id)
      .get(NODE_HEAD) // get head node
      .not() // protection if its removed
      .then(unpack)
    // return Promise.resolve({} as VCState)
  }

  async getVChannelElder(id: VCID): Promise<VCState | null> {
    if (!id) throw new Error('no id given')

    // TODO: slow to double check if key exist
    // required when key does not exist and hangs
    const exists = await this._vchanByID(id).not()
    if (!exists) return null

    return this._vchanByID(id)
      .get(NODE_HEAD_PREV) // get head node
      .not() // protection if its removed
      .then(unpack)
  }

  async getVChannelbyNonce(id: VCID, seq: number): Promise<VCState | null> {
    if (!id) throw new Error('no id given')
    if (!Number.isInteger(seq)) throw new Error('seq not valid integer')

    //const deep = Array.from(Array(seq), () => 'next')
    //console.log(seq, 'deep', deep)

    const state = this._vchanByID(id)
      .path([NODE_TABLE, seq])
      .not()

    //if (seq > 0) tail = tail.path(deep)

    return state.then(unpack)

    /*const r = await _listify(
      this._vchanByID(id)
        .get(NODE_TABLE)
        .once()
        .map()
        .path('nonce'),
      false
    )

    console.log('=====r', r)

    if (seq >= r.length) return null
    const val = r[seq]
    unpack(val)

    return val
    */
    //.then(unpack)
  }

  // latest by nonce
  getVChannels(ledger: LCID, cb: (lc: VCState) => void): void {
    const lc = this._ledgerByID(ledger)
    //if (!(await lc)) throw new Error('no ledger matching ' + ledger)
    return lc
      .get(LC_VCHANNELS_KEY)
      .once()
      .map()
      .path(NODE_HEAD) // get the latest node
      .once((x: any) => {
        if (x) cb(unpack(x))
        return x
      })

    // return Promise.resolve([] as VCState[])
  }
  getAllVChannels(cb: (lc: VCState) => void): void {
    return this._lcs
      .once()
      .map()
      .path(LC_VCHANNELS_KEY) // + '.' + NODE_HEAD)
      .map()
      .path(NODE_HEAD)
      .once((x: any) => {
        if (x) cb(unpack(x))
        return x
      })
    /*return this._vcs
      .once() // bug
      .map() // get the latest node
      .path(NODE_HEAD)
      .once((x: any) => {
        if (x) cb(unpack(x))
        return x
      })*/
  }

  async getLCStateCount(id: string): Promise<number> {
    const vc = await this.getLC(id)
    return !vc ? 0 : vc!.nonce
  }

  async getVChannelStateCount(id: string): Promise<number> {
    const vc = await this.getVChannel(id)
    return !vc ? 0 : vc!.nonce
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
    const listPromise = this._lcs
      .once()
      .map()
      .path(LC_VCHANNELS_KEY)
    return _listify(listPromise)
  }
}

/*async function _listify(gunkey: any, getHead: boolean = true): Promise<any[]> {
  if (!getHead) {
    return new Promise<any[]>((resolve, rejected) => {
      return gunkey.once().synclist((x: any) => resolve(x.list))
    })
  } else return _listify2(gunkey, true)
}*/

async function _listify(gunkey: any, getHead: boolean = true): Promise<any[]> {
  const listPromise = gunkey // do not call .once here
  const listVal = await listPromise
  delete listVal['_'] // remove gundb key first, before reading key length
  // get all keys with values
  const len = Object.keys(listVal).filter((k: any) => !!listVal[k]).length

  if (len === 0) return Promise.resolve([])
  let count = 0
  const total: any[] = []

  return new Promise<any[]>((resolve, rejected) => {
    let m: any = listPromise.map()

    // if getHead, seek to use the HEAD key
    if (getHead) m = m.path(NODE_HEAD)

    m.once((x: LCState, index: string) => {
      // TODO find a way to track keys, doesn't work with HEAD
      if (!getHead && !listVal[index]) {
        console.log('warning: discarding new entry')
        return
      }
      count++
      if (!!x) total.push(unpack(x))
      if (count == len) resolve(total)
    })
  })
}

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}

//const mapHead = function(this: any, node: any) {
//  return node
//return !!node.head ? this.get(NODE_HEAD).once() : node
//}
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
