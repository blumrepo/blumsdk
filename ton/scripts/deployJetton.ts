import 'dotenv/config'
import { mnemonicToWalletKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { Address, toNano } from '@ton/core'
import { BlumSdk, DexType, JettonData } from '../src'

const TESTNET = true
const TEST_CURVE = true

const USER_MNEMONIC = process.env.DEPLOYER_MNEMONIC
const FACTORY_ADDRESS = Address.parse(process.env.FACTORY_ADDRESS)

const JETTON_DATA: JettonData = {
  name: 'Test Jetton 2',
  description: 'Test Jetton description',
  image: 'https://cdn-icons-png.flaticon.com/512/9908/9908191.png',
  symbol: 'TJ',
  decimals: 9,
}

const INITIAL_BUY_AMOUNT = toNano(0.5)
// const INITIAL_BUY_AMOUNT = 0n

async function main() {
  const sdk = new BlumSdk(undefined, TESTNET, TEST_CURVE)

  const userKeyPair = await mnemonicToWalletKey(USER_MNEMONIC.split(' '))
  const userWallet = WalletContractV4.create({ publicKey: userKeyPair.publicKey, workchain: 0 })
  const userSender = sdk.client.open(userWallet).sender(userKeyPair.secretKey)

  console.log('User Address: ' + userWallet.address.toString({ testOnly: TESTNET, bounceable: false }))

  await sdk.sendDeployJetton(userSender, FACTORY_ADDRESS, DexType.STONFI, JETTON_DATA, false, INITIAL_BUY_AMOUNT)
}

main().catch(console.error)
