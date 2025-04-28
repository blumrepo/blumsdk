import 'dotenv/config'
import { mnemonicToWalletKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { Address } from '@ton/core'
import { BlumSdk } from '../src'
import { Minter } from '../src/contracts/Minter'
import { Wallet } from '../src/contracts/Wallet'

const TESTNET = true
const TEST_CURVE = true

const USER_MNEMONIC = process.env.USER_MNEMONIC
const JETTON_ADDRESS = Address.parse(process.env.JETTON_ADDRESS)

async function main() {
  const sdk = new BlumSdk(undefined, TESTNET, TEST_CURVE)

  const userKeyPair = await mnemonicToWalletKey(USER_MNEMONIC.split(' '))
  const userWallet = WalletContractV4.create({ publicKey: userKeyPair.publicKey, workchain: 0 })
  const userSender = sdk.client.open(userWallet).sender(userKeyPair.secretKey)

  console.log('User Address: ' + userWallet.address.toString({ testOnly: TESTNET, bounceable: false }))

  const minter = sdk.client.open(Minter.createFromAddress(JETTON_ADDRESS))
  const jettonWalletAddress = await minter.getWalletAddress(userWallet.address)
  const wallet = sdk.client.open(Wallet.createFromAddress(jettonWalletAddress))
  const balance = await wallet.getJettonBalance()

  await sdk.sendSell(userSender, jettonWalletAddress, balance, 0n)
}

main().catch(console.error)
