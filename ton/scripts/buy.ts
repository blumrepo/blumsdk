import 'dotenv/config'
import { mnemonicToWalletKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { Address, toNano } from '@ton/core'
import { BlumSdk } from '../src'

const TESTNET = true
const TEST_CURVE = true

const USER_MNEMONIC = process.env.USER_MNEMONIC
const JETTON_ADDRESS = Address.parse(process.env.JETTON_ADDRESS)

const BUY_AMOUNT = toNano(0.4)

async function main() {
  const sdk = new BlumSdk(undefined, TESTNET, TEST_CURVE)

  const userKeyPair = await mnemonicToWalletKey(USER_MNEMONIC.split(' '))
  const userWallet = WalletContractV4.create({ publicKey: userKeyPair.publicKey, workchain: 0 })
  const userSender = sdk.client.open(userWallet).sender(userKeyPair.secretKey)

  console.log('User Address: ' + userWallet.address.toString({ testOnly: TESTNET, bounceable: false }))

  await sdk.sendBuy(userSender, JETTON_ADDRESS, BUY_AMOUNT, 0n)
}

main().catch(console.error)
