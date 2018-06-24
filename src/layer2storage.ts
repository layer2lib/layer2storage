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

export interface State {
  id: string
  nonce: string
  isClosed?: boolean
  party: Address
  counterparty: Address
  sig: string
  sig_counterpary?: string
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
  appState?: StrObject // challenger?: address;
}

/*
interface PaymentState extends LCState {
  sender: Address
  balance: string
}
*/
export function makeLCState(
  id: string,
  nonce: string,
  party: Address,
  counterparty: Address,
  sig: string,
  vcRootHash: string,
  balanceA: BigNumber,
  balanceB: BigNumber,
  openVCs: number = 0
): LCState {
  return { id, nonce, party, counterparty, sig, openVCs, vcRootHash, balanceA, balanceB }
}

export function makeVCState(
  id: string,
  nonce: string,
  party: Address,
  counterparty: Address,
  sig: string,
  lcId: string,
  balanceA: BigNumber,
  balanceB: BigNumber,
  appState?: StrObject
): VCState {
  return { id, nonce, party, counterparty, sig, lcId, balanceA, balanceB, appState }
}

export interface L2Database {
  logdriver(): void
  set(k: string, v: any): void // for misc data
  get(k: string): any

  storeLC(data: LCState): Promise<LCState>
  updateLC(data: LCState): Promise<LCState> // replace if same nonce
  getLC(ledgerID: LCID): Promise<LCState> // latest by nonce
  getLCs(): Promise<LCState[]> // latest by nonce
  delLC(id: LCID): Promise<void>

  storeVChannel(data: VCState): Promise<VCState>
  delVChannel(chan: VCID): Promise<void>
  // replace if same nonce
  updateVChannel(chan: VCID, data: VCState): Promise<VCState>
  getVChannel(ledger: VCID): Promise<VCState> // latest by nonce
  getAllVChannels(ledger?: LCID): Promise<VCState[]> // latest by nonce
}

type Gun = any

export class GunStorageProxy implements L2Database {
  private dbKeys: { [key: string]: boolean } = {}
  private prefix: string = ''
  private gun: any

  private _lcs: any
  private _lc: any
  constructor(gun: Gun, prefix: string = 'layer2') {
    // super()
    if (!gun) throw new Error('Redis instance missing from constructor')
    this.gun = gun
    this.prefix = prefix

    this._lcs = this._db.get('ledgers')
    this._lc = this._db.get('ledger')
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
    const l = this._ledgerByID(data.id).put(data)
    //.then((sdata: LCState) => sdata)
    const c = await this._lcs.set(l)
    // console.log('c', c)
    return await l
    // return Promise.resolve(data)
  }
  // replace if same nonce
  async updateLC(data: LCState): Promise<LCState> {
    if (!data.id) throw new Error('no id given')
    // optimize away?
    const stored = !!this.getLC(data.id)
    if (!stored) throw new Error('ledger id was not stored previously')

    return this._ledgerByID(data.id)
      .put(data)
      .then((sdata: LCState) => sdata)
  }
  // latest by nonce
  async getLC(ledgerID: LCID): Promise<LCState> {
    if (!ledgerID) throw new Error('no id given')
    return this._ledgerByID(ledgerID).once()
  }
  // latest by nonce
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

    return timeout(1000).then((x: any) => lcs)
  }

  getLCsMap(cb: (lc: LCState) => void): void {
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
    return Promise.resolve(data)
  }
  async delVChannel(chan: VCID): Promise<void> {
    return Promise.resolve()
  }
  // replace if same nonce
  async updateVChannel(chan: VCID, data: VCState): Promise<VCState> {
    return Promise.resolve(data)
  }
  // latest by nonce
  async getVChannel(ledger: VCID): Promise<VCState> {
    return Promise.resolve({} as VCState)
  }
  // latest by nonce
  async getAllVChannels(ledger?: LCID): Promise<VCState[]> {
    return Promise.resolve([] as VCState[])
  }
}
