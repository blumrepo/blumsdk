import { Tokenomics } from './contracts/Tokenomics'
import { BN, Program, Provider } from '@coral-xyz/anchor'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { MemePad } from './contracts/sources/meme_pad'
import idl from './contracts/sources/meme_pad.json'

export interface ReferralData {
  partner: PublicKey
}

export class BlumSolSdk {
  #tokenomics: Tokenomics
  #program: Program<MemePad>

  constructor(provider: Provider, curveA: bigint) {
    this.#tokenomics = new Tokenomics(curveA)
    this.#program = new Program(idl as MemePad, provider)
  }

  async createTokenInstruction(
    mintAddress: PublicKey,
    name: string,
    symbol: string,
    uri: string,
  ): Promise<TransactionInstruction> {
    return await this.#program.methods
      .create(name, symbol, uri)
      .accounts({
        mintAccount: mintAddress,
      })
      .instruction()
  }

  async buyInstruction(
    mintAddress: PublicKey,
    solAmount: bigint,
    minTokenReceive: bigint,
    referralData: ReferralData,
  ): Promise<TransactionInstruction> {
    return await this.#program.methods
      .buy(toBN(solAmount), toBN(minTokenReceive), referralData)
      .accounts({
        program: this.#program.programId,
        mintAccount: mintAddress,
      })
      .instruction()
  }

  async sellInstruction(
    mintAddress: PublicKey,
    tokenAmount: bigint,
    minSolReceive: bigint,
    referralData: ReferralData,
  ): Promise<TransactionInstruction> {
    return await this.#program.methods
      .sell(toBN(tokenAmount), toBN(minSolReceive), referralData)
      .accounts({
        program: this.#program.programId,
        mintAccount: mintAddress,
      })
      .instruction()
  }

  async getCirculatingSupply(mintAddress: PublicKey) {
    let bondingCurve = await this.#program.account.bondingCurve.fetch(this.#getBondingCurveAddress(mintAddress))
    return fromBN(bondingCurve.tokenThreshold) - fromBN(bondingCurve.reserveToken)
  }

  getTokenAmountForBuy(supply: bigint, threshold: bigint, solAmount: bigint): bigint {
    return this.#tokenomics.calculateTokenAmount(supply, threshold, solAmount)
  }

  getSolAmountForSell(supply: bigint, tokenAmount: bigint): bigint {
    return this.#tokenomics.calculateSolAmountForSell(supply, tokenAmount)
  }

  getSolAmountForBuy(supply: bigint, tokenAmount: bigint): bigint {
    return this.#tokenomics.calculateSolAmountForBuy(supply, tokenAmount)
  }

  #getBondingCurveAddress(mintAddress: PublicKey) {
    const [bondingCurveAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding_curve'), mintAddress.toBuffer()],
      this.#program.programId,
    )

    return bondingCurveAddress
  }
}

function toBN(value: bigint) {
  return new BN(value.toString())
}

function fromBN(value: BN) {
  return BigInt(value)
}
