import { ethers } from 'ethers'
import tokenFactoryAbi from './abi/token-factory-abi.json'
import { TransactionData } from './TransactionData'

/**
 * DEX type constants
 */
export enum DexType {
  PANCAKE = 0,
}

/**
 * Token deployment parameters
 */
export interface TokenDeployParams {
  dexType: DexType
  name: string
  symbol: string
  tokenURI: string
  hasAgent: boolean
  customPayload: string
}

/**
 * Fee configuration parameters
 */
export interface FeeConfig {
  deployFee: bigint
  agentDeployFee: bigint
  buyFeeBasis: number
  sellFeeBasis: number
  liquidityFee: bigint
}

/**
 * TokenFactory SDK - Transaction Generator
 */
export class TokenFactorySDK {
  private address: string
  private interface: ethers.Interface
  private provider: ethers.Provider

  /**
   * Constructor
   * @param contractAddress The TokenFactory contract address
   * @param rpcUrl
   */
  constructor(contractAddress: string, rpcUrl: string) {
    this.address = contractAddress
    this.interface = new ethers.Interface(tokenFactoryAbi)
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
  }

  /**
   * Get the contract address
   */
  getAddress(): string {
    return this.address
  }

  /**
   * Create transaction data to deploy a token
   * @param params Token deployment parameters
   * @param value The ETH value to send with the transaction
   * @returns Transaction data object
   */
  createDeployTokenTx(params: TokenDeployParams, value: bigint): TransactionData {
    // Encode custom payload to bytes if it's not already
    const customPayload =
      typeof params.customPayload === 'string' && !params.customPayload.startsWith('0x')
        ? ethers.toUtf8Bytes(params.customPayload)
        : params.customPayload

    // Create calldata
    const data = this.interface.encodeFunctionData('deployToken', [
      params.dexType,
      params.name,
      params.symbol,
      params.tokenURI,
      params.hasAgent,
      customPayload,
    ])

    return {
      to: this.address,
      data,
      value,
    }
  }

  /**
   * Create transaction data to set the fee recipient
   * @param feeRecipient The new fee recipient address
   * @returns Transaction data object
   */
  createSetFeeRecipientTx(feeRecipient: string): TransactionData {
    const data = this.interface.encodeFunctionData('setFeeRecipient', [feeRecipient])

    return {
      to: this.address,
      data,
    }
  }

  /**
   * Create transaction data to set curve A parameter
   * @param curveA The new curve A value
   * @returns Transaction data object
   */
  createSetCurveATx(curveA: bigint): TransactionData {
    const data = this.interface.encodeFunctionData('setCurveA', [curveA])

    return {
      to: this.address,
      data,
    }
  }

  /**
   * Create transaction data to set fees
   * @param feeConfig The new fee configuration
   * @returns Transaction data object
   */
  createSetFeesTx(feeConfig: FeeConfig): TransactionData {
    const data = this.interface.encodeFunctionData('setFees', [
      feeConfig.deployFee,
      feeConfig.agentDeployFee,
      feeConfig.buyFeeBasis,
      feeConfig.sellFeeBasis,
      feeConfig.liquidityFee,
    ])

    return {
      to: this.address,
      data,
    }
  }

  /**
   * Create transaction data to withdraw funds from the contract
   * @param amount The amount to withdraw
   * @returns Transaction data object
   */
  createWithdrawTx(amount: bigint): TransactionData {
    const data = this.interface.encodeFunctionData('withdraw', [amount])

    return {
      to: this.address,
      data,
    }
  }

  /**
   * Get the owner of the TokenFactory
   * @returns The owner address
   */
  async getOwner(): Promise<string> {
    const interface_ = new ethers.Interface(tokenFactoryAbi)
    const data = interface_.encodeFunctionData('owner', [])
    const result = await this.provider.call({ to: this.address, data })
    return interface_.decodeFunctionResult('owner', result)[0]
  }

  /**
   * Get the current curve parameter A
   * @returns The curve A value
   */
  async getCurveA(): Promise<bigint> {
    const interface_ = new ethers.Interface(tokenFactoryAbi)
    const data = interface_.encodeFunctionData('curveA', [])
    const result = await this.provider.call({ to: this.address, data })
    return interface_.decodeFunctionResult('curveA', result)[0]
  }

  /**
   * Get the current fee recipient address
   * @returns The fee recipient address
   */
  async getFeeRecipient(): Promise<string> {
    const interface_ = new ethers.Interface(tokenFactoryAbi)
    const data = interface_.encodeFunctionData('feeRecipient', [])
    const result = await this.provider.call({ to: this.address, data })
    return interface_.decodeFunctionResult('feeRecipient', result)[0]
  }

  /**
   * Get the current fee configuration
   * @returns The fee configuration
   */
  async getFeeConfig(): Promise<FeeConfig> {
    const interface_ = new ethers.Interface(tokenFactoryAbi)

    const calls = [
      interface_.encodeFunctionData('deployFee', []),
      interface_.encodeFunctionData('agentDeployFee', []),
      interface_.encodeFunctionData('buyFeeBasis', []),
      interface_.encodeFunctionData('sellFeeBasis', []),
      interface_.encodeFunctionData('liquidityFee', []),
    ]

    const results = await Promise.all(calls.map((call) => this.provider.call({ to: this.address, data: call })))

    return {
      deployFee: interface_.decodeFunctionResult('deployFee', results[0])[0],
      agentDeployFee: interface_.decodeFunctionResult('agentDeployFee', results[1])[0],
      buyFeeBasis: interface_.decodeFunctionResult('buyFeeBasis', results[2])[0],
      sellFeeBasis: interface_.decodeFunctionResult('sellFeeBasis', results[3])[0],
      liquidityFee: interface_.decodeFunctionResult('liquidityFee', results[4])[0],
    }
  }
}
