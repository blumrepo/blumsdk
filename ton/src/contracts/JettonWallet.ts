import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core'

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address)
  }

  static burnMessage(jetton_amount: bigint, responseAddress: Address, customPayload: Cell | null, queryId: number = 0) {
    return beginCell()
      .storeUint(0x595f07bc, 32)
      .storeUint(queryId, 64)
      .storeCoins(jetton_amount)
      .storeAddress(responseAddress)
      .storeMaybeRef(customPayload)
      .endCell()
  }

  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    jetton_amount: bigint,
    responseAddress: Address,
    customPayload: Cell | null,
    queryId: number = 0,
  ) {
    await provider.internal(via, {
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: JettonWallet.burnMessage(jetton_amount, responseAddress, customPayload, queryId),
      value: value,
    })
  }
}
