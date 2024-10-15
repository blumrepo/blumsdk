import { toNano } from '@ton/core'

export abstract class Op {
  static transfer = 0xf8a7ea5
  static transfer_notification = 0x7362d09c
  static internal_transfer = 0x178d4519
  static excesses = 0xd53276db

  static mint = 21

  static change_admin = 3
  static change_content = 4
  static buy = 5
  static deploy_real_master_contract = 6

  static deposit_liquidity_to_de_dust = 7
  static deposit_liquidity_to_ston_fi = 8
  static pton_transfer = 0x01f3835d

  static withdraw_ton = 9
  static nullify_admin = 10
}

export abstract class Fee {
  static buyFee = toNano('0.12')
}
