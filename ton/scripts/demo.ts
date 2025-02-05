import { mnemonicToWalletKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { Address, toNano } from '@ton/core'
import { BlumSdk, DexType, JettonData } from '../src'
import { Minter } from '../src/contracts/Minter'

const TESTNET = true
const TEST_CURVE = true

const USER_MNEMONIC = ''
const FACTORY_ADDRESS = Address.parse('')
const EXISTING_JETTON_ADDRESS = Address.parse('')

const JETTON_DATA: JettonData = {
  name: 'Test Jetton',
  description: 'Test Jetton description',
  image: 'https://cdn-icons-png.flaticon.com/512/9908/9908191.png',
  symbol: 'TJ',
  decimals: 9,
}
const BUY_AMOUNT = toNano(0.5)
const SELL_AMOUNT = toNano(100_000)

async function main() {
  const sdk = new BlumSdk(null, TESTNET, TEST_CURVE)

  const userKeyPair = await mnemonicToWalletKey(USER_MNEMONIC.split(' '))
  const userWallet = WalletContractV4.create({ publicKey: userKeyPair.publicKey, workchain: 0 })
  const userSender = sdk.client.open(userWallet).sender(userKeyPair.secretKey)

  console.log('User Address: ' + userWallet.address.toString({ testOnly: TESTNET, bounceable: false }))

  // Deploy new jetton

  await sdk.sendDeployJetton(userSender, FACTORY_ADDRESS, DexType.STONFI, JETTON_DATA, BUY_AMOUNT)

  // Buy

  await sdk.sendBuy(userSender, EXISTING_JETTON_ADDRESS, BUY_AMOUNT, 0n)

  // Sell

  const minter = sdk.client.open(Minter.createFromAddress(EXISTING_JETTON_ADDRESS))
  const jettonWalletAddress = await minter.getWalletAddress(userWallet.address)

  await sdk.sendSell(userSender, jettonWalletAddress, userWallet.address, SELL_AMOUNT, 0n)

  // Unlock

  await sdk.sendUnlock(userSender, jettonWalletAddress)
}

main().catch(console.error)
