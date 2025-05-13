import { toNano } from '@ton/core'

export const MAX_SUPPLY = toNano(1_000_000_000)
export const THRESHOLD_SUPPLY = toNano(800_000_000)

export namespace math {
  export namespace fp {
    // Fixed-point operations with 10^18 precision
    const FP_MULTIPLIER = 1000000000000000000n // 10^18
    const FP_ONE_9 = 1000000000n // 10^9

    export function muldivr(a: bigint, b: bigint, c: bigint): bigint {
      const mul = a * b
      const halfDivisor = c / 2n

      if (mul >= 0) {
        return (mul + halfDivisor) / c
      } else {
        return (mul - halfDivisor) / c
      }
    }

    export function muldiv(a: bigint, b: bigint, c: bigint): bigint {
      return (a * b) / c
    }

    export function muldivc(a: bigint, b: bigint, c: bigint): bigint {
      const mul = a * b
      return (mul + c - 1n) / c
    }

    export function mul(a: bigint, b: bigint): bigint {
      return muldiv(a, b, FP_MULTIPLIER)
      // (a * b) / FP_MULTIPLIER
    }

    export function div(a: bigint, b: bigint): bigint {
      return muldiv(a, FP_MULTIPLIER, b)
      // (a * FP_MULTIPLIER) / b
    }

    export function to(a: bigint): bigint {
      return a * FP_ONE_9
    }

    export function from(a: bigint): bigint {
      return a / FP_ONE_9
    }
  }
}

const vTon: bigint = 333333333333333333n
const vToken: bigint = 333333333333333333n
const K: bigint = 444444444444444444n

export class Tokenomics {
  public thresholdTons: bigint

  constructor(thresholdTons: bigint) {
    this.thresholdTons = thresholdTons
  }

  #toNano(amount: number | bigint | string) {
    return Number(amount) * 10 ** 9
  }

  #fromNano(amount: number | bigint | string) {
    return Number(amount) / 10 ** 9
  }

  #realTon(availableTokens: bigint): bigint {
    const fpTokenSupply = math.fp.to(THRESHOLD_SUPPLY)
    const kTon = math.fp.mul(K, math.fp.to(this.thresholdTons))
    let kJetton = math.fp.mul(vToken, fpTokenSupply)

    const a = math.fp.mul(kTon, fpTokenSupply)
    const b = kJetton + availableTokens

    return math.fp.div(a, b) - math.fp.mul(vTon, math.fp.to(this.thresholdTons))
  }

  calculateJettonAmount(totalSupply: bigint, tonAmount: bigint) {
    const rToken = math.fp.to(THRESHOLD_SUPPLY - totalSupply)
    const rTon = this.#realTon(rToken)

    const kJetton = math.fp.mul(vToken, math.fp.to(THRESHOLD_SUPPLY))
    const a = math.fp.mul(math.fp.to(tonAmount), kJetton + rToken)
    const b = math.fp.mul(vTon, math.fp.to(this.thresholdTons)) + math.fp.to(tonAmount) + rTon

    return math.fp.from(math.fp.div(a, b))
  }

  calculateTonAmount(totalSupply: bigint, jettonAmount: bigint) {
    const fpJettonAmount = math.fp.to(jettonAmount)
    const rToken = math.fp.to(THRESHOLD_SUPPLY) - math.fp.to(totalSupply)
    const rTon = this.#realTon(rToken)

    const kTon = math.fp.mul(vTon, math.fp.to(this.thresholdTons))
    const kJetton = math.fp.mul(vToken, math.fp.to(THRESHOLD_SUPPLY))

    const a = math.fp.mul(fpJettonAmount, kTon + rTon)
    const b = kJetton + fpJettonAmount + rToken
    return math.fp.from(math.fp.div(a, b))
  }

  calculateBuyAmount(totalSupply: bigint, tonAmount: bigint, feeBasis: bigint) {
    const fee = (tonAmount * feeBasis) / 10_000n
    const amount = tonAmount - fee

    const jettonAmount = this.calculateJettonAmount(totalSupply, amount)

    if (jettonAmount + totalSupply > THRESHOLD_SUPPLY) {
      return THRESHOLD_SUPPLY - totalSupply
    }

    return jettonAmount
  }

  calculateSellAmount(totalSupply: bigint, jettonAmount: bigint, feeBasis: bigint) {
    const tonAmount = this.calculateTonAmount(totalSupply, jettonAmount)
    const fee = (tonAmount * feeBasis) / 10_000n
    return tonAmount - fee
  }

  calculateTonsForAllCoins(feeBasis: bigint) {
    var tonsNeed = this.calculateTonAmount(THRESHOLD_SUPPLY, THRESHOLD_SUPPLY)
    var fullTonsNeed = math.fp.muldivc(tonsNeed, 10000n, 10000n - feeBasis) + 1n
    var fees = math.fp.muldiv(fullTonsNeed, feeBasis, 10000n)
    return [fees, fullTonsNeed]
  }

  calculatePrice(totalSupply: bigint) {
    if (totalSupply == 0n) {
      return 0
    }

    const rToken = math.fp.to(THRESHOLD_SUPPLY) - math.fp.to(totalSupply)
    const rTon = this.#realTon(rToken)

    const kTon = math.fp.mul(vTon, math.fp.to(this.thresholdTons))
    const kJetton = math.fp.mul(vToken, math.fp.to(THRESHOLD_SUPPLY))

    const a = kTon + rTon
    const b = kJetton + rToken

    return this.#fromNano(math.fp.from(math.fp.div(a, b)))
  }

  calculateMarketCap(totalSupply: bigint) {
    const priceInTon = this.calculatePrice(totalSupply)
    return priceInTon * this.#fromNano(MAX_SUPPLY)
  }
}
