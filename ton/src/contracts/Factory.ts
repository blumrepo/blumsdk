import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, toNano } from '@ton/core'

import { Fee } from './Fee'

class Op {
  static setAdmin = 0x4d5f2cca
  static setJettonAdmin = 0xc4ad01a9
  static setFeeRecipient = 0xf8b61d78
  static setFees = 0x4b89c3d4
  static setCodes = 0x20fce0f1
  static withdraw = 0xcb03bfaf
  static deployJetton = 0xd8ca3cab
}

export enum DexType {
  STONFI = 0,
  DEDUST = 1,
}

export type FactoryConfig = {
  admin: Address
  jettonAdmin: Address
  feeRecipient: Address
  deployFee: bigint
  buyFeeBasis: bigint
  sellFeeBasis: bigint
  liquidityFee: bigint
  minterCodeStonFi: Cell
  minterCodeDeDust: Cell
  walletCode: Cell
  stonFiRouter: Address
  stonFiRouterPtonWallet: Address
}

export function factoryConfigToCell(config: FactoryConfig): Cell {
  return beginCell()
    .storeAddress(config.admin)
    .storeAddress(config.jettonAdmin)
    .storeAddress(config.feeRecipient)
    .storeRef(
      beginCell()
        .storeCoins(config.deployFee)
        .storeUint(config.buyFeeBasis, 16)
        .storeUint(config.sellFeeBasis, 16)
        .storeCoins(config.liquidityFee)
        .endCell(),
    )
    .storeRef(
      beginCell()
        .storeRef(config.minterCodeStonFi)
        .storeRef(config.minterCodeDeDust)
        .storeRef(config.walletCode)
        .endCell(),
    )
    .storeRef(beginCell().storeAddress(config.stonFiRouter).storeAddress(config.stonFiRouterPtonWallet).endCell())
    .endCell()
}

export class Factory implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Factory(address)
  }

  static createFromConfig(config: Cell, code: Cell, workchain = 0) {
    const init = { code, data: config }
    return new Factory(contractAddress(workchain, init), init)
  }

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: Fee.deployGas,
      body: beginCell().endCell(),
    })
  }

  async sendDeployJetton(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    dexType: DexType,
    content: Cell,
    buyAmount: bigint = 0n,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      // value: deployFee + Fee.deployGas + (buyAmount == 0n ? Fee.initialGas : buyAmount + Fee.buyGas),
      value: value,
      body: beginCell()
        .storeUint(Op.deployJetton, 32)
        .storeUint(queryId, 64)
        .storeUint(dexType, 1)
        .storeRef(content)
        .storeCoins(buyAmount)
        .endCell(),
    })
  }

  async sendSetAdmin(provider: ContractProvider, via: Sender, newAdmin: Address, queryId: number = 0) {
    await provider.internal(via, {
      value: toNano(0.1),
      body: beginCell().storeUint(Op.setAdmin, 32).storeUint(queryId, 64).storeAddress(newAdmin).endCell(),
    })
  }

  async sendSetJettonAdmin(provider: ContractProvider, via: Sender, newAdmin: Address, queryId: number = 0) {
    await provider.internal(via, {
      value: toNano(0.1),
      body: beginCell().storeUint(Op.setJettonAdmin, 32).storeUint(queryId, 64).storeAddress(newAdmin).endCell(),
    })
  }

  async sendSetFeeRecipient(provider: ContractProvider, via: Sender, newFeeRecipient: Address, queryId: number = 0) {
    await provider.internal(via, {
      value: toNano(0.1),
      body: beginCell()
        .storeUint(Op.setFeeRecipient, 32)
        .storeUint(queryId, 64)
        .storeAddress(newFeeRecipient)
        .endCell(),
    })
  }

  async sendSetFees(
    provider: ContractProvider,
    via: Sender,
    deployFee: bigint,
    buyFeeBasis: bigint,
    sellFeeBasis: bigint,
    liquidityFee: bigint,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      value: toNano(0.1),
      body: beginCell()
        .storeUint(Op.setFees, 32)
        .storeUint(queryId, 64)
        .storeCoins(deployFee)
        .storeUint(buyFeeBasis, 16)
        .storeUint(sellFeeBasis, 16)
        .storeCoins(liquidityFee)
        .endCell(),
    })
  }

  async sendSetCodes(
    provider: ContractProvider,
    via: Sender,
    minterCodeStonFi: Cell,
    minterCodeDeDust: Cell,
    walletCode: Cell,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      value: toNano(0.1),
      body: beginCell()
        .storeUint(Op.setCodes, 32)
        .storeUint(queryId, 64)
        .storeRef(minterCodeStonFi)
        .storeRef(minterCodeDeDust)
        .storeRef(walletCode)
        .endCell(),
    })
  }

  async sendWithdraw(provider: ContractProvider, via: Sender, amount: bigint, queryId: number = 0) {
    await provider.internal(via, {
      value: toNano(0.1),
      body: beginCell().storeUint(Op.withdraw, 32).storeUint(queryId, 64).storeCoins(amount).endCell(),
    })
  }

  async getBalance(provider: ContractProvider) {
    return (await provider.getState()).balance
  }

  async getConfig(provider: ContractProvider) {
    let res = await provider.get('get_config', [])

    return {
      admin: res.stack.readAddress(),
      jettonAdmin: res.stack.readAddress(),
      feeRecipient: res.stack.readAddress(),
      deployFee: res.stack.readBigNumber(),
      buyFeeBasis: res.stack.readBigNumber(),
      sellFeeBasis: res.stack.readBigNumber(),
      liquidityFee: res.stack.readBigNumber(),
      minterCodeStonFi: res.stack.readCell(),
      minterCodeDeDust: res.stack.readCell(),
      walletCode: res.stack.readCell(),
    }
  }
}
