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
  sig_counterparty?: Sig
}

// stringify subobjects
const complexKeys = ['sig', 'sig_counterparty']
function unpack(o: any): any {
  if (!o) return o
  complexKeys.forEach((k: string) => {
    if (o[k] && isString(o[k])) o[k] = JSON.parse(o[k])
  })
  return o
}
function pack(o: any): any {
  if (!o) return o
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
  }
  logdriver() {
    // Log out current engine
    console.log('js-layer2lib using gun driver')
  }


  async keys() {
    return Object.keys(this.dbKeys)
  }

  async storeLC(data: LCState, ledgerID: LCID): Promise<LCState> {
    if (!data.id) throw new Error('no id given')

    pack(data)

    const lcState = this._db.get(data.id).put(data)

    const lcPointerSet = this._db.get(LCID)
    await this.lcPointerSet.set(lcState)
    const _highestSequence = this._lcs.get('highestSequence')
    if(_highestSequence === undefined) { _highestSequence = 0 }
    if(data.nonce > _highestSequence) { this._lcs.set({highestSequence: _highestSequence})}
    return await l.then(unpack)
  }
  // replace if same nonce
  async updateLC(data: LCState): Promise<LCState> {
    if (!data.id) throw new Error('no id given')
    // optimize away?
    const lc = this._db.get(data.id)
    const stored = await lc.not()
    if (!stored) throw new Error('ledger id was not stored previously')

    if (stored.nonce > data.nonce) return data

    pack(data)

    return lc
      .put(data)
      .once()
      .then(unpack)
  }
  // latest by nonce
  async getLCbyID(ledgerID: LCID): Promise<LCState> {
    if (!ledgerID) throw new Error('no id given')
    const _highestSequence = this._db.get(LCID).get('highestSequence')
    return this._db.get(LCID).get(_highestSequence)
      .once() // .load()
      .then(unpack)
  }

  async getLCbySequence(ledgerID: LCID, seq: number): Promise<LCState> {
    if (!ledgerID) throw new Error('no id given')
    return this._db.get(LCID).get(number)
      .once() // .load()
      .then(unpack)
  }

  getLCs(ledgerID: LCID): Promise<LCState> {
    this._db.get(LCID).
      .once()
      .map()
      .val()
  }

  // This needs to be better defined

  // async delLC(id: LCID): Promise<void> {
  //   if (!id) throw new Error('no id given')
  //   if (!!(<any>id).id) throw new Error('object was given instead of id')

  //   const l = this._ledgerByID(id).once()
  //   if (!l) throw new Error('lenger ' + id + ' does not exist to delete')
  //   await this._lcs.unset(l)
  //   return l.put(null)
  // }

  async storeVChannel(data: VCState, ledgerID: VCID): Promise<VCState> {
    const id = data.id
    const lcId = data.lcId
    if (!id) throw new Error('no id given')
    if (!lcId) throw new Error('no lcId given')

    const vcState = this._db.get(id).put(data)

    const vcPointerSet = this._db.get(VCID)
    await this.vcPointerSet.set(vcState)

    return vc.then(unpack)
  }

  async delVChannel(id: VCID): Promise<void> {
    if (!id) throw new Error('no id given')
    if (!!(<any>id).id) throw new Error('object was given instead of id')


    // this removes the pointer node, todo: map through and remove each vc state then the pointer node
    await this._db.unset(id)
    return
  }
  // replace if same nonce
  async updateVChannel(data: VCState): Promise<VCState> {
    if (!data.id) throw new Error('no id given')
    // optimize away?
    const vc = this._db.get(data.id)
    const stored = await vc.not()
    if (!stored) throw new Error('ledger id was not stored previously')

    if (stored.nonce > data.nonce) return data

    pack(data)

    return vc
      .put(data)
      .once()
      .then(unpack)
  }
  // latest by nonce
  async getVChannel(id: VCID): Promise<VCState> {
    if (!id) throw new Error('no id given')
    const _highestSequence = this._db.get(id).get('highestSequence')
    return this._db.get(id).get(_highestSequence)
      .once() // .load()
      .then(unpack)
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
        if (x) cb(unpack(x))
        return x
      })

    // return Promise.resolve([] as VCState[])
  }
  getVCs(ledgerID: VCID): Promise<LCState> {
    this._db.get(VCID).
      .once()
      .map()
      .val()
  }


}
