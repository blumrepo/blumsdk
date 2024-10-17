export const MAX_SUPPLY = 1_000_000_000_000_000_000n
export const BUY_FEE_PERCENT = 1n
export const SELL_FEE_PERCENT = 1n

const PRECISION = 9n

const THRESHOLD_TONS: bigint = 1_833_000_000_000n
const THRESHOLD_SUPPLY = 799_999_999_998_688_507n
const CURVE_A = 590_892_876_676n

const THRESHOLD_TONS_TESTNET: bigint = 10_000_000_000n
const THRESHOLD_SUPPLY_TESTNET = 673_997_717_000_000_000n
const CURVE_A_TESTNET = 6_739_977_170_000n

export class Tokenomics {
  thresholdTons: bigint
  thresholdSupply: bigint
  #curveA: bigint

  constructor(testnet: boolean = false) {
    this.thresholdTons = testnet ? THRESHOLD_TONS_TESTNET : THRESHOLD_TONS
    this.thresholdSupply = testnet ? THRESHOLD_SUPPLY_TESTNET : THRESHOLD_SUPPLY
    this.#curveA = testnet ? CURVE_A_TESTNET : CURVE_A
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
    return (sqrtValue * this.#curveA) / mult
  }

  #fReverse(value: bigint) {
    if (value == 0n) {
      return 0n
    }

    const mult = 10n ** PRECISION
    const sqrValue = value ** 2n * mult
    return sqrValue / this.#curveA ** 2n / mult
  }

  #fromNano(amount: number | bigint | string) {
    return Number(amount) / 10 ** 9
  }

  tonSupply(totalSupply: bigint) {
    return this.#fReverse(totalSupply)
  }

  calculateJettonAmount(totalSupply: bigint, tonAmount: bigint) {
    const supply = this.#fReverse(totalSupply)
    return this.#f(supply + tonAmount) - this.#f(supply)
  }

  calculateTonAmount(totalSupply: bigint, jettonAmount: bigint) {
    return this.#fReverse(totalSupply) - this.#fReverse(totalSupply - jettonAmount)
  }

  calculateBuyAmount(totalSupply: bigint, tonAmount: bigint) {
    const amount = tonAmount - (tonAmount * BUY_FEE_PERCENT) / 100n

    const jettonAmount = this.calculateJettonAmount(totalSupply, amount)

    if (jettonAmount + totalSupply > this.thresholdSupply) {
      return this.thresholdSupply - totalSupply
    }

    return jettonAmount
  }

  calculateSellAmount(totalSupply: bigint, jettonAmount: bigint) {
    const tonAmount = this.calculateTonAmount(totalSupply, jettonAmount)
    return tonAmount - (tonAmount * SELL_FEE_PERCENT) / 100n
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
