import { toNano } from '@ton/core'

export abstract class Fee {
  static deployGas = toNano(0.02)
  static initialGas = toNano(0.015)
  static buyGas = toNano(0.08)
  static sellGas = toNano(0.02)
  static burnGas = toNano(0.05)

  static buyForward = toNano(0.04)
}
