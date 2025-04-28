export const MAX_SUPPLY = 1_000_000_000_000_000_000n
export const THRESHOLD_SUPPLY = 800_000_000_000_000_000n

const PRECISION = 9n

export class Tokenomics {
  public thresholdTons: bigint
  public curveA: bigint

  constructor(thresholdTons: bigint, curveA: bigint) {
    this.thresholdTons = thresholdTons
    this.curveA = curveA
  }

  #sqrt(n: bigint): bigint {
    let x = n
    let y = (x + 1n) >> 1n
    while (y < x) {
      x = y
      y = (x + n / x) >> 1n
    }
    return x
  }

  #f(value: bigint) {
    if (value == 0n) {
      return 0n
    }

    const mult = 10n ** PRECISION
    const sqrtValue = this.#sqrt(value * mult * mult)
    return (sqrtValue * this.curveA) / mult
  }

  #fReverse(value: bigint) {
    if (value == 0n) {
      return 0n
    }

    const mult = 10n ** PRECISION
    const sqrValue = value ** 2n * mult
    return sqrValue / this.curveA ** 2n / mult
  }

  #fromNano(amount: number | bigint | string) {
    return Number(amount) / 10 ** 9
  }

  tonSupply(totalSupply: bigint) {
    return this.#fReverse(totalSupply)
  }

  calculateJettonAmount(totalSupply: bigint, tonAmount: bigint) {
    const supply = this.#fReverse(totalSupply)
    return this.#f(supply + tonAmount) - totalSupply
  }

  calculateTonAmount(totalSupply: bigint, jettonAmount: bigint) {
    return this.#fReverse(totalSupply) - this.#fReverse(totalSupply - jettonAmount)
  }

  calculateBuyAmount(totalSupply: bigint, tonAmount: bigint, feeBasis: bigint) {
    const fee = tonAmount * feeBasis / 10_000n
    const amount = tonAmount - fee

    const jettonAmount = this.calculateJettonAmount(totalSupply, amount)

    if (jettonAmount + totalSupply > THRESHOLD_SUPPLY) {
      return THRESHOLD_SUPPLY - totalSupply
    }

    return jettonAmount
  }

  calculateSellAmount(totalSupply: bigint, jettonAmount: bigint, feeBasis: bigint) {
    const tonAmount = this.calculateTonAmount(totalSupply, jettonAmount)
    const fee = tonAmount * feeBasis / 10_000n
    return  tonAmount - fee
  }

  calculatePrice(totalSupply: bigint) {
    const one = 10 ** 9
    const amountForOneTon = this.calculateJettonAmount(totalSupply, BigInt(one))
    return one / Number(amountForOneTon)
  }

  calculateMarketCap(totalSupply: bigint) {
    const priceInTon = this.calculatePrice(totalSupply)
    return priceInTon * this.#fromNano(MAX_SUPPLY)
  }
}
