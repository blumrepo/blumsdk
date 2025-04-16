import { ethers } from 'ethers'
import bondingCurveTokenAbi from './abi/bonding-curve-token-abi.json'
import { TransactionData } from './TransactionData'

/**
 * BondingCurveToken SDK - Transaction Generator
 */
export class BondingCurveTokenSDK {
  private address: string
  private interface: ethers.Interface
  private provider: ethers.Provider

  /**
   * Constructor
   * @param contractAddress The token contract address
   * @param rpcUrl
   */
  constructor(contractAddress: string, rpcUrl: string) {
    this.address = contractAddress
    this.interface = new ethers.Interface(bondingCurveTokenAbi)
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
  }

  /**
   * Get the contract address
   */
  getAddress(): string {
    return this.address
  }

  createDepositLiquidityTx(): TransactionData {
    const data = this.interface.encodeFunctionData('depositLiquidity', [])

    return {
      to: this.address,
      data
    }
  }

  /**
   * Create transaction data to buy tokens
   * @param value The ETH value to send
   * @param minReceive
   * @param customPayload Optional custom payload
   * @returns Transaction data object
   */
  createBuyTx(value: bigint, minReceive: bigint, customPayload: string = '0x'): TransactionData {
    // Encode custom payload if needed
    const payload =
      typeof customPayload === 'string' && !customPayload.startsWith('0x')
        ? ethers.toUtf8Bytes(customPayload)
        : customPayload

    const data = this.interface.encodeFunctionData('buy', [minReceive, payload])

    return {
      to: this.address,
      data,
      value,
    }
  }

  /**
   * Create transaction data to sell tokens
   * @param amount The amount of tokens to sell
   * @param minReceive
   * @param customPayload Optional custom payload
   * @returns Transaction data object
   */
  createSellTx(amount: bigint, minReceive: bigint, customPayload: string = '0x'): TransactionData {
    // Encode custom payload if needed
    const payload =
      typeof customPayload === 'string' && !customPayload.startsWith('0x')
        ? ethers.toUtf8Bytes(customPayload)
        : customPayload

    const data = this.interface.encodeFunctionData('sell', [amount, minReceive, payload])

    return {
      to: this.address,
      data,
    }
  }

  /**
   * Create call data to get token balance for an address
   * @param address The address to check
   * @returns The parsed bigint balance
   */
  async getBalanceOf(address: string): Promise<bigint> {
    const interface_ = new ethers.Interface(bondingCurveTokenAbi)
    const data = interface_.encodeFunctionData('balanceOf', [address])
    const result = await this.provider.call({ to: this.address, data })
    return interface_.decodeFunctionResult('balanceOf', result)[0]
  }

  /**
   * Create call data to get total supply
   * @returns The parsed bigint total supply
   */
  async getTotalSupply(): Promise<bigint> {
    const interface_ = new ethers.Interface(bondingCurveTokenAbi)
    const data = interface_.encodeFunctionData('totalSupply', [])
    const result = await this.provider.call({ to: this.address, data })
    return interface_.decodeFunctionResult('totalSupply', result)[0]
  }

  async getName(): Promise<string> {
    const interface_ = new ethers.Interface(bondingCurveTokenAbi)
    const data = interface_.encodeFunctionData('name', [])
    const result = await this.provider.call({ to: this.address, data })
    return interface_.decodeFunctionResult('name', result)[0]
  }

  async getSymbol(): Promise<string> {
    const interface_ = new ethers.Interface(bondingCurveTokenAbi)
    const data = interface_.encodeFunctionData('symbol', [])
    const result = await this.provider.call({ to: this.address, data })
    return interface_.decodeFunctionResult('symbol', result)[0]
  }

  async getPhase(): Promise<number> {
    const interface_ = new ethers.Interface(bondingCurveTokenAbi)
    const data = interface_.encodeFunctionData("phase");
    const result = await this.provider.call({ to: this.address, data });
    return Number(interface_.decodeFunctionResult("phase", result)[0]);
  }
}
