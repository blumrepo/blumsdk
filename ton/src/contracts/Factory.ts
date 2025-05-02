import { Address, beginCell, Cell, Contract, ContractProvider, Sender } from '@ton/core'
import { Maybe } from '@ton/core/dist/utils/maybe'

class Op {
  static deployJetton = 0xd8ca3cab
}

export enum DexType {
  STONFI = 0,
  DEDUST = 1,
}

export class Factory implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Factory(address)
  }

  async sendDeployJetton(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    dexType: DexType,
    content: Cell,
    hasAgent: boolean,
    buyAmount: bigint = 0n,
    customPayload: Maybe<Cell> = null,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      value: value,
      body: beginCell()
        .storeUint(Op.deployJetton, 32)
        .storeUint(queryId, 64)
        .storeUint(dexType, 1)
        .storeRef(content)
        .storeBit(hasAgent)
        .storeCoins(buyAmount)
        .storeMaybeRef(customPayload)
        .endCell(),
    })
  }

  async getConfig(provider: ContractProvider) {
    let res = await provider.get('get_config', [])

    return {
      admin: res.stack.readAddress(),
      jettonAdmin: res.stack.readAddress(),
      feeRecipient: res.stack.readAddress(),
      curveA: res.stack.readBigNumber(),
      deployFee: res.stack.readBigNumber(),
      agentDeployFee: res.stack.readBigNumber(),
      buyFeeBasis: res.stack.readBigNumber(),
      sellFeeBasis: res.stack.readBigNumber(),
      liquidityFee: res.stack.readBigNumber(),
      minterCodeStonFi: res.stack.readCell(),
      minterCodeDeDust: res.stack.readCell(),
      walletCode: res.stack.readCell(),
    }
  }
}
