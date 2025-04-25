import { toNano } from '@ton/core'

export abstract class Fee {
  static deployJettonGas = toNano(0.05)
  static initialGas = toNano(0.015)
  static buyGas = toNano(0.08)
  static sellGas = toNano(0.08)
  static unlockGas = toNano(0.05)
}
