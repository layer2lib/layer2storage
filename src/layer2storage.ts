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

interface State {
  Id: string
  nonce: string
  isClosed: boolean
  party: Address
  counterparty: Address
  sig: string
  sig_counterpary?: string
}

interface Balances {
  balanceA: BigNumber
  balanceB: BigNumber
}

interface LCState extends State {
  openVCs: number
  vc_root_hash: string
  balances: Balances
}

interface VCState extends State {
  LC_ID: string
  balances: Balances
  app_state?: StrObject // challenger?: address;
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
  constructor(gun: Gun, prefix: string = 'layer2') {
    // super()
    if (!gun) throw new Error('Redis instance missing from constructor')
    this.gun = gun
    this.prefix = prefix
  }
  logdriver() {
    // Log out current engine
    console.log('js-layer2lib using gun driver')
  }
  async set(k: string, v: StrObject) {
    if (!k) throw new Error('key cannot be null or empty')
    if (!v) throw new Error('value cannot be null or empty')
    this.dbKeys[k] = true
    await this.gun
      .get(this.prefix)
      .get(k)
      .put(v)
  }
  async get(k: string) {
    let res = await this.gun
      .get(this.prefix)
      .get(k)
      .val()
    return res
  }
  async keys() {
    return Object.keys(this.dbKeys)
  }

  storeLC(data: LCState): Promise<LCState> {
    return Promise.resolve(data)
  }
  // replace if same nonce
  updateLC(data: LCState): Promise<LCState> {
    return Promise.resolve(data)
  }
  // latest by nonce
  getLC(ledgerID: LCID): Promise<LCState> {
    return Promise.resolve({} as LCState)
  }
  // latest by nonce
  getLCs(): Promise<LCState[]> {
    return Promise.resolve([] as LCState[])
  }
  delLC(id: LCID): Promise<void> {
    return Promise.resolve()
  }

  storeVChannel(data: VCState): Promise<VCState> {
    return Promise.resolve(data)
  }
  delVChannel(chan: VCID): Promise<void> {
    return Promise.resolve()
  }
  // replace if same nonce
  updateVChannel(chan: VCID, data: VCState): Promise<VCState> {
    return Promise.resolve(data)
  }
  // latest by nonce
  getVChannel(ledger: VCID): Promise<VCState> {
    return Promise.resolve({} as VCState)
  }
  // latest by nonce
  getAllVChannels(ledger?: LCID): Promise<VCState[]> {
    return Promise.resolve([] as VCState[])
  }
}
