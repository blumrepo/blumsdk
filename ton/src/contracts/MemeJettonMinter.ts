import { Address, beginCell, Cell, Contract, ContractProvider, Sender, toNano } from '@ton/core'

const OP_BUY = 0x2ce5eed2

export const BUY_MAINTENANCE_FEE = toNano(0.08)

export class MemeJettonMinter implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new MemeJettonMinter(address)
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

  async sendBuy(provider: ContractProvider, via: Sender, value: bigint, minReceive: bigint, queryId: number = 0) {
    await provider.internal(via, {
      value: value + BUY_MAINTENANCE_FEE,
      body: beginCell().storeUint(OP_BUY, 32).storeUint(queryId, 64).storeCoins(value).storeCoins(minReceive).endCell(),
    })
  }
}
