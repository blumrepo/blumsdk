import { Address, beginCell, Cell, Contract, ContractProvider, Sender } from '@ton/core'

import { Fee } from './Fee'
import { Maybe } from '@ton/core/dist/utils/maybe'
import { DexType } from './Factory'

class Op {
  static buy = 0xaf750d34
}

export enum Phase {
  TRADING = 0,
  PENDING_DEX_LIQUIDITY = 1,
  LISTED = 2,
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

  async getCoinPrice(provider: ContractProvider) {
    let res = await provider.get('coin_price', [])
    return Number(res.stack.readBigNumber()) / 10 ** 9
  }

  async getCoinsForTons(provider: ContractProvider, tons: bigint) {
    let res = await provider.get('coins_for_tons', [{ type: 'int', value: tons }])
    return [res.stack.readBigNumber(), res.stack.readBigNumber()]
  }

  async getTonsForCoins(provider: ContractProvider, coins: bigint) {
    let res = await provider.get('tons_for_coins', [{ type: 'int', value: coins }])
    return [res.stack.readBigNumber(), res.stack.readBigNumber()]
  }

  async sendBuy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    minReceive: bigint,
    destination: Maybe<Address> = null,
    customPayload: Maybe<Cell> = null,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      value: value + Fee.buyGas,
      body: beginCell()
        .storeUint(Op.buy, 32)
        .storeUint(queryId, 64)
        .storeCoins(minReceive)
        .storeAddress(destination)
        .storeMaybeRef(customPayload)
        .endCell(),
    })
  }

  async getBclData(provider: ContractProvider) {
    const res = await provider.get('get_bcl_data', [])

    const dexType = res.stack.readNumber()

    if (dexType == DexType.STONFI) {
      return {
        dexType,
        totalSupply: res.stack.readBigNumber(),
        bclSupply: res.stack.readBigNumber(),
        liqSupply: res.stack.readBigNumber(),
        factory: res.stack.readAddress(),
        author: res.stack.readAddress(),
        content: res.stack.readCell(),
        feeAddress: res.stack.readAddress(),
        buyFeeBasis: res.stack.readNumber(),
        sellFeeBasis: res.stack.readNumber(),
        lastTradeDate: res.stack.readNumber(),
        phase: res.stack.readNumber(),
        tonLiqCollected: res.stack.readBigNumber(),
        tradingCloseFee: res.stack.readBigNumber(),
        fullPriceTon: res.stack.readBigNumber(),
        fullPriceTonFees: res.stack.readBigNumber(),
        routerAddress: res.stack.readAddress(),
        routerPtonWalletAddress: res.stack.readAddress(),
      }
    } else if (dexType == DexType.DEDUST) {
      return {
        dexType,
        totalSupply: res.stack.readBigNumber(),
        bclSupply: res.stack.readBigNumber(),
        liqSupply: res.stack.readBigNumber(),
        factory: res.stack.readAddress(),
        admin: res.stack.readAddress(),
        author: res.stack.readAddress(),
        content: res.stack.readCell(),
        feeAddress: res.stack.readAddress(),
        buyFeeBasis: res.stack.readNumber(),
        sellFeeBasis: res.stack.readNumber(),
        lastTradeDate: res.stack.readNumber(),
        phase: res.stack.readNumber(),
        tonLiqCollected: res.stack.readBigNumber(),
        tradingCloseFee: res.stack.readBigNumber(),
        fullPriceTon: res.stack.readBigNumber(),
        fullPriceTonFees: res.stack.readBigNumber(),
      }
    } else {
      return {}
    }
  }
}
