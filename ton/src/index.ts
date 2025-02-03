import { Address, beginCell, OpenedContract, Sender, SenderArguments, storeStateInit } from '@ton/core'
import { CHAIN, SendTransactionRequest } from '@tonconnect/sdk'
import { TonApiClientWrapper } from './api/ton-client-api-wrapper'
import { MemeJettonMinter } from './contracts/MemeJettonMinter'
import { JettonWallet } from './contracts/JettonWallet'
import { MAX_SUPPLY, Tokenomics } from './contracts/Tokenomics'
import { DexType, Factory } from './contracts/Factory'
import { Fee } from './contracts/JettonConstants'
import { internalOnchainContentToCell } from '@ton-community/assets-sdk/dist/utils'

export type JettonData = {
  name: string
  description: string
  image: string
  symbol: string
  decimals: number
  [key: string]: string | number
}

export class BlumSdk {
  #testnet: boolean
  #tokenomics: Tokenomics
  #client: TonApiClientWrapper

  constructor(tonApiKey?: string, testnet: boolean = false, testCurve: boolean = false) {
    this.#testnet = testnet
    this.#tokenomics = new Tokenomics(testCurve)

    this.#client = new TonApiClientWrapper({
      baseUrl: testnet ? 'https://testnet.tonapi.io' : 'https://tonapi.io',
      apiKey: tonApiKey,
    })
  }

  async #request(sendCallback: (sender: Sender) => Promise<void>): Promise<SendTransactionRequest> {
    let args: SenderArguments
    const sender = {
      send: async (_args: SenderArguments) => {
        args = _args
      },
    }

    await sendCallback(sender)

    const message = {
      address: args.to.toString(),
      amount: args.value.toString(),
      stateInit: undefined,
      payload: args.body?.toBoc().toString('base64'),
    }

    if (args.init) {
      message.stateInit = beginCell().store(storeStateInit(args.init)).endCell().toBoc().toString('base64')
    }

    return {
      validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes for user to approve
      network: this.#testnet ? CHAIN.TESTNET : CHAIN.MAINNET,
      messages: [message],
    }
  }

  #memeJettonMinterContractFromAddress(address: Address): OpenedContract<MemeJettonMinter> {
    const memeJettonMinter = MemeJettonMinter.createFromAddress(address)
    return this.#client.open(memeJettonMinter)
  }

  async sendDeployJetton(
    sender: Sender,
    factoryAddress: Address,
    dexType: DexType,
    jettonData: JettonData,
    initialBuyAmount: bigint,
    queryId: number = 0,
  ) {
    let factory = this.#client.open(Factory.createFromAddress(factoryAddress))
    let config = await factory.getConfig()

    let value =
      config.deployFee + Fee.deployGas + (initialBuyAmount == 0n ? Fee.initialGas : initialBuyAmount + Fee.buyGas)
    let content = internalOnchainContentToCell(jettonData)

    await factory.sendDeployJetton(sender, value, dexType, content, initialBuyAmount, queryId)
  }

  async sendBuy(sender: Sender, jettonAddress: Address, amount: bigint, minReceive: bigint, queryId: number = 0) {
    await this.#memeJettonMinterContractFromAddress(jettonAddress).sendBuy(sender, amount, minReceive, null, queryId)
  }

  async sendSell(
    sender: Sender,
    jettonWalletAddress: Address,
    userAddress: Address,
    amount: bigint,
    minReceive: bigint,
    queryId: number = 0,
  ) {
    const jettonWallet = JettonWallet.createFromAddress(jettonWalletAddress)
    const contract = this.#client.open(jettonWallet)
    await contract.sendBurn(
      sender,
      Fee.burnGas,
      amount,
      userAddress,
      beginCell().storeCoins(minReceive).endCell(),
      queryId,
    )
  }

  getThresholdTons(): bigint {
    return this.#tokenomics.thresholdTons
  }

  getTonSupply(totalSupply: bigint): bigint {
    return this.#tokenomics.tonSupply(totalSupply)
  }

  getMaxSupply(): bigint {
    return MAX_SUPPLY
  }

  getThresholdSupply(): bigint {
    return this.#tokenomics.thresholdSupply
  }

  getPrice(totalSupply: bigint): number {
    return this.#tokenomics.calculatePrice(totalSupply)
  }

  getMarketCap(totalSupply: bigint): number {
    return this.#tokenomics.calculateMarketCap(totalSupply)
  }

  getBuyAmount(totalSupply: bigint, tonAmount: bigint, feeBasis: bigint): bigint {
    return this.#tokenomics.calculateBuyAmount(totalSupply, tonAmount, feeBasis)
  }

  getSellAmount(totalSupply: bigint, jettonAmount: bigint, feeBasis: bigint): bigint {
    return this.#tokenomics.calculateSellAmount(totalSupply, jettonAmount, feeBasis)
  }

  async getWalletAddress(jettonAddress: Address, userAddress: Address): Promise<Address> {
    return this.#memeJettonMinterContractFromAddress(jettonAddress).getWalletAddress(userAddress)
  }

  async getTotalSupply(jettonAddress: Address): Promise<bigint> {
    return this.#memeJettonMinterContractFromAddress(jettonAddress).getTotalSupply()
  }

  // Helpers for getting SendTransactionRequest

  async getDeployJettonRequest(
    factoryAddress: Address,
    dexType: DexType,
    jettonData: JettonData,
    initialBuyAmount: bigint,
    queryId: number = 0,
  ): Promise<SendTransactionRequest> {
    return this.#request((sender: Sender) => {
      return this.sendDeployJetton(sender, factoryAddress, dexType, jettonData, initialBuyAmount, queryId)
    })
  }

  async getBuyRequest(
    jettonAddress: Address,
    amount: bigint,
    minReceive: bigint,
    queryId: number = 0,
  ): Promise<SendTransactionRequest> {
    return this.#request((sender: Sender) => {
      return this.sendBuy(sender, jettonAddress, amount, minReceive, queryId)
    })
  }

  async getSellRequest(
    jettonWalletAddress: Address,
    userAddress: Address,
    amount: bigint,
    minReceive: bigint,
    queryId: number = 0,
  ): Promise<SendTransactionRequest> {
    return this.#request((sender: Sender) => {
      return this.sendSell(sender, jettonWalletAddress, userAddress, amount, minReceive, queryId)
    })
  }
}
