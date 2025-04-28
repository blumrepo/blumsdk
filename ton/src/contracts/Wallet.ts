import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core'
import { Maybe } from '@ton/core/dist/utils/maybe'
import { Fee } from './Fee'

class Op {
  static sell = 0x742b36d8
  static unlock = 0xf0fd50bb
}

export class Wallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Wallet(address)
  }

  static sellMessage(
    jettonAmount: bigint,
    minTonAmount: bigint,
    customPayload: Maybe<Cell> = null,
    queryId: number = 0,
  ) {
    return beginCell()
      .storeUint(Op.sell, 32)
      .storeUint(queryId, 64)
      .storeCoins(jettonAmount)
      .storeCoins(minTonAmount)
      .storeMaybeRef(customPayload)
      .endCell()
  }

  static unlockMessage(queryId: number = 0) {
    return beginCell().storeUint(Op.unlock, 32).storeUint(queryId, 64).endCell()
  }

  async getJettonBalance(provider: ContractProvider) {
    let state = await provider.getState()
    if (state.state.type !== 'active') {
      return 0n
    }
    let res = await provider.get('get_wallet_data', [])
    return res.stack.readBigNumber()
  }

  async getUnlocked(provider: ContractProvider) {
    let state = await provider.getState()
    if (state.state.type !== 'active') {
      return false
    }
    let res = await provider.get('get_unlocked', [])
    return res.stack.readBoolean()
  }

  async sendSell(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    jettonAmount: bigint,
    minTonAmount: bigint,
    customPayload: Maybe<Cell> = null,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Wallet.sellMessage(jettonAmount, minTonAmount, customPayload, queryId),
      value: value,
    })
  }

  async sendUnlock(provider: ContractProvider, via: Sender, queryId: number = 0) {
    await provider.internal(via, {
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Wallet.unlockMessage(queryId),
      value: Fee.unlockGas,
    })
  }
}
