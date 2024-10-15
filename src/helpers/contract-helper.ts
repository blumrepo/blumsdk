import * as fs from 'fs'
import * as path from 'path'
import { Cell } from '@ton/core'

export function getMemeJettonMinterCode(testnet: boolean) {
  const minter = fs.readFileSync(
    path.resolve(
      __dirname,
      testnet ? './contracts/sources/testnet/meme_jetton_minter.cell' : './contracts/sources/meme_jetton_minter.cell',
    ),
  )
  return Cell.fromBoc(minter)[0]
}

export function getJettonMinterCode() {
  const minter = fs.readFileSync(path.resolve(__dirname, './contracts/sources/jetton_minter.cell'))
  return Cell.fromBoc(minter)[0]
}

export function getJettonWalletCode() {
  const minter = fs.readFileSync(path.resolve(__dirname, './contracts/sources/jetton_wallet.cell'))
  return Cell.fromBoc(minter)[0]
}
