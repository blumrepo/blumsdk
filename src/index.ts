import { Address, beginCell, OpenedContract, Sender, SenderArguments, storeStateInit, toNano } from '@ton/core'
import { CHAIN, SendTransactionRequest } from '@tonconnect/sdk'
import { internalOnchainContentToCell } from '@ton-community/assets-sdk/dist/utils'
import { TonApiClientWrapper } from './api/ton-client-api-wrapper'
import { MemeJettonMinter } from './contracts/MemeJettonMinter'
import { getJettonMinterCode, getJettonWalletCode, getMemeJettonMinterCode } from './helpers/contract-helper'
import { JettonWallet } from './contracts/JettonWallet'
import { JettonMinter } from '@ton-community/assets-sdk'
import { PTON_ADDRESS, PTON_ADDRESS_TESTNET, STON_FI_ROUTER_ADDRESS, STON_FI_ROUTER_ADDRESS_TESTNET } from './constants'
import { MAX_SUPPLY, Tokenomics } from './contracts/Tokenomics'

export type JettonData = {
  name: string
  description: string
  image: string
  symbol: string
  decimals: number
}

export class BlumSdk {
  #testnet: boolean
  #tokenomics: Tokenomics
  #client: TonApiClientWrapper

  constructor(tonApiKey?: string, testnet: boolean = false) {
    this.#testnet = testnet
    this.#tokenomics = new Tokenomics(testnet)

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

  #memeJettonMinterContractFromConfig(adminAddress: Address, jettonData: JettonData): OpenedContract<MemeJettonMinter> {
    const memeJettonMinter = MemeJettonMinter.createFromConfig(
      {
        admin: adminAddress,
        content: internalOnchainContentToCell(jettonData),
        walletCode: getJettonWalletCode(),
      },
      getMemeJettonMinterCode(this.#testnet),
    )

    return this.#client.open(memeJettonMinter)
  }

  #jettonMinterContractFromAddress(address: Address): OpenedContract<JettonMinter> {
    const jettonMinter = JettonMinter.createFromAddress(address)
    return this.#client.open(jettonMinter)
  }

  #jettonMinterContractFromConfig(adminAddress: Address, jettonData: JettonData): OpenedContract<JettonMinter> {
    const jettonMinter = JettonMinter.createFromConfig(
      {
        admin: adminAddress,
        content: internalOnchainContentToCell(jettonData),
        jettonWalletCode: getJettonWalletCode(),
      },
      getJettonMinterCode(),
    )

    return this.#client.open(jettonMinter)
  }

  async sendCreateJetton(
    sender: Sender,
    adminAddress: Address,
    jettonData: JettonData,
    buyAmount: bigint,
    minReceive: bigint,
    queryId: number = 0,
  ) {
    const contract = this.#memeJettonMinterContractFromConfig(adminAddress, jettonData)

    if (buyAmount == 0n) {
      await contract.sendDeploy(sender)
    } else {
      await contract.sendBuy(sender, buyAmount, minReceive, queryId)
    }
  }

  async sendBuy(sender: Sender, jettonAddress: Address, amount: bigint, minReceive: bigint, queryId: number = 0) {
    await this.#memeJettonMinterContractFromAddress(jettonAddress).sendBuy(sender, amount, minReceive, queryId)
  }

  async sendSell(
    sender: Sender,
    jettonWalletAddress: Address,
    userAddress: Address,
    amount: bigint,
    queryId: number = 0,
  ) {
    const jettonWallet = JettonWallet.createFromAddress(jettonWalletAddress)
    const contract = this.#client.open(jettonWallet)
    await contract.sendBurn(sender, toNano(0.3), amount, userAddress, null, queryId)
  }

  async sendDeployFinalJetton(
    sender: Sender,
    jettonAddress: Address,
    finalJettonData: JettonData,
    queryId: number = 0,
  ) {
    await this.#memeJettonMinterContractFromAddress(jettonAddress).sendDeployMinter(
      sender,
      toNano(0.01),
      getJettonMinterCode(),
      internalOnchainContentToCell(finalJettonData),
      queryId,
    )
  }

  async sendDepositLiquidityToStonFi(
    sender: Sender,
    jettonAddress: Address,
    finalJettonData: JettonData,
    queryId: number = 0,
  ) {
    const routerAddress = Address.parse(this.#testnet ? STON_FI_ROUTER_ADDRESS_TESTNET : STON_FI_ROUTER_ADDRESS)
    const pTonAddress = Address.parse(this.#testnet ? PTON_ADDRESS_TESTNET : PTON_ADDRESS)

    const finalJettonAddress = this.getFinalJettonAddress(jettonAddress, finalJettonData)

    const pTonWalletOfRouterAddress =
      await this.#jettonMinterContractFromAddress(pTonAddress).getWalletAddress(routerAddress)
    const jettonWalletOfRouterAddress =
      await this.#jettonMinterContractFromAddress(finalJettonAddress).getWalletAddress(routerAddress)

    const deadline = Math.floor(Date.now() / 1000) + 15 * 60 // 15 minutes

    await this.#memeJettonMinterContractFromAddress(jettonAddress).sendDepositLiquidityToStonFi(
      sender,
      toNano(0.01),
      routerAddress,
      pTonWalletOfRouterAddress,
      jettonWalletOfRouterAddress,
      finalJettonAddress,
      deadline,
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

  getBuyAmount(totalSupply: bigint, tonAmount: bigint): bigint {
    return this.#tokenomics.calculateBuyAmount(totalSupply, tonAmount)
  }

  getSellAmount(totalSupply: bigint, jettonAmount: bigint): bigint {
    return this.#tokenomics.calculateSellAmount(totalSupply, jettonAmount)
  }

  getJettonAddress(adminAddress: Address, jettonData: JettonData): Address {
    const contract = this.#memeJettonMinterContractFromConfig(adminAddress, jettonData)
    return contract.address
  }

  getFinalJettonAddress(jettonAddress: Address, finalJettonData: JettonData): Address {
    const contract = this.#jettonMinterContractFromConfig(jettonAddress, finalJettonData)
    return contract.address
  }

  async getWalletAddress(jettonAddress: Address, userAddress: Address): Promise<Address> {
    return this.#memeJettonMinterContractFromAddress(jettonAddress).getWalletAddress(userAddress)
  }

  async getTotalSupply(jettonAddress: Address): Promise<bigint> {
    return this.#memeJettonMinterContractFromAddress(jettonAddress).getTotalSupply()
  }

  // Helpers for getting SendTransactionRequest

  async getCreateJettonRequest(
    adminAddress: Address,
    jettonData: JettonData,
    buyAmount: bigint,
    minReceive: bigint,
    queryId: number = 0,
  ): Promise<SendTransactionRequest> {
    return this.#request((sender: Sender) => {
      return this.sendCreateJetton(sender, adminAddress, jettonData, buyAmount, minReceive, queryId)
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
    queryId: number = 0,
  ): Promise<SendTransactionRequest> {
    return this.#request((sender: Sender) => {
      return this.sendSell(sender, jettonWalletAddress, userAddress, amount, queryId)
    })
  }
}
