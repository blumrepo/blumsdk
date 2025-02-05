import { Address, beginCell, Cell, Contract, ContractProvider, Sender } from '@ton/core'

import { Fee } from './Fee'
import { Maybe } from '@ton/core/dist/utils/maybe'

class Op {
  static buy = 0xaf750d34
}

export class Minter implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Minter(address)
  }

  async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
    const res = await provider.get('get_wallet_address', [
      { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
    ])
    return res.stack.readAddress()
  }

  async getJettonData(provider: ContractProvider) {
    let res = await provider.get('get_jetton_data', [])
    let totalSupply = res.stack.readBigNumber()
    let mintable = res.stack.readBoolean()
    let adminAddress = res.stack.readAddressOpt()
    let content = res.stack.readCell()
    let walletCode = res.stack.readCell()
    return {
      totalSupply,
      mintable,
      adminAddress,
      content,
      walletCode,
    }
  }

  async getTotalSupply(provider: ContractProvider) {
    let res = await this.getJettonData(provider)
    return res.totalSupply
  }

  async sendBuy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    minReceive: bigint,
    destination: Maybe<Address> = null,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      value: value + Fee.buyGas,
      body: beginCell()
        .storeUint(Op.buy, 32)
        .storeUint(queryId, 64)
        .storeCoins(minReceive)
        .storeAddress(destination)
        .endCell(),
    })
  }
}
