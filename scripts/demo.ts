import { fromNano, OpenedContract, toNano } from '@ton/core'
import { BlumSdk, JettonData } from '../dist'
import { mnemonicToWalletKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { TonApiClientWrapper } from '../src/api/ton-client-api-wrapper'
import { sleep } from '@ton-community/assets-sdk/dist/utils'

async function main() {

  // Configuration

  const TESTNET = true

  const TONAPI_API_KEY = null
  const ADMIN_MNEMONIC = ''
  const BUYER_MNEMONIC = ''

  const INITIAL_BUY_AMOUNT = toNano(5)
  const BUY_AMOUNT = toNano(10)

  const MEME_JETTON_DATA: JettonData = {
    name: 'Meme Sample Jetton',
    description: 'Sample description',
    image: 'https://cdn-icons-png.flaticon.com/512/9908/9908191.png',
    symbol: 'memSJ',
    decimals: 9
  }

  const FINAL_JETTON_DATA: JettonData = {
    name: 'Sample Jetton',
    description: 'Sample description',
    image: 'https://cdn-icons-png.flaticon.com/512/9908/9908191.png',
    symbol: 'SJ',
    decimals: 9
  }

  // Script body

  const client = new TonApiClientWrapper({
    baseUrl: TESTNET ? 'https://testnet.tonapi.io' : 'https://tonapi.io',
    apiKey: TONAPI_API_KEY
  })

  const buyerKey = await mnemonicToWalletKey(BUYER_MNEMONIC.split(' '))
  const buyerWallet = WalletContractV4.create({ publicKey: buyerKey.publicKey, workchain: 0 })

  console.log('Buyer Address: ' + buyerWallet.address.toString({ testOnly: TESTNET, bounceable: false }))

  const adminKey = await mnemonicToWalletKey(ADMIN_MNEMONIC.split(' '))
  const adminWallet = WalletContractV4.create({ publicKey: adminKey.publicKey, workchain: 0 })

  console.log('Admin Address: ' + adminWallet.address.toString({ testOnly: TESTNET, bounceable: false }))

  if (!await client.isContractDeployed(buyerWallet.address)) {
    return console.log('Buyer wallet is not deployed')
  }

  const buyerWalletContract = client.open(buyerWallet)
  const buyerSender = buyerWalletContract.sender(buyerKey.secretKey)
  const buyerBalance = await buyerWalletContract.getBalance()

  console.log('Buyer Balance:', fromNano(buyerBalance))

  if (!await client.isContractDeployed(adminWallet.address)) {
    return console.log('Admin wallet is not deployed')
  }

  const adminWalletContract = client.open(adminWallet)
  const adminSender = adminWalletContract.sender(adminKey.secretKey)
  const adminBalance = await adminWalletContract.getBalance()

  console.log('Admin Balance:', fromNano(adminBalance))

  const sdk = new BlumSdk(TONAPI_API_KEY, TESTNET)

  const jettonAddress = sdk.getJettonAddress(adminWallet.address, MEME_JETTON_DATA)

  if (!await client.isContractDeployed(jettonAddress)) {
    console.log('MemeJettonMinter contract is not deployed. Deploying...')

    const seqNo = await buyerWalletContract.getSeqno()
    await sdk.sendCreateJetton(buyerSender, adminWallet.address, MEME_JETTON_DATA, INITIAL_BUY_AMOUNT)
    await confirmTransaction(seqNo, buyerWalletContract)

    console.log('User deployed MemeJettonMinter contract: ' + jettonAddress.toString({ testOnly: TESTNET, bounceable: true }))
  } else {
    console.log('MemeJettonMinter contract already deployed: ' + jettonAddress.toString({ testOnly: TESTNET, bounceable: true }))
  }

  // Buy meme jettons by User

  const seqNo = await buyerWalletContract.getSeqno()
  await sdk.sendBuy(buyerSender, jettonAddress, BUY_AMOUNT)
  await confirmTransaction(seqNo, buyerWalletContract)

  console.log('Buyer tried to buy ' + fromNano(BUY_AMOUNT) + ' meme tokens')

  // Deploy final jetton by Admin

  const finalJettonAddress = sdk.getFinalJettonAddress(jettonAddress, FINAL_JETTON_DATA)

  if (!await client.isContractDeployed(finalJettonAddress)) {
    console.log('Final jetton is not deployed. Deploying...')

    const seqNo2 = await adminWalletContract.getSeqno()
    await sdk.sendDeployFinalJetton(adminSender, jettonAddress, FINAL_JETTON_DATA)
    await confirmTransaction(seqNo2, adminWalletContract)

    console.log('Admin deployed final jetton: ' + finalJettonAddress.toString({ testOnly: TESTNET, bounceable: true }))
  } else {
    console.log('Final jetton already deployed: ' + finalJettonAddress.toString({ testOnly: TESTNET, bounceable: true }))
  }

  // Deposit liquidity to Ston.fi V2 by Admin

  const seqNo3 = await adminWalletContract.getSeqno()
  await sdk.sendDepositLiquidityToStonFi(adminSender, jettonAddress, FINAL_JETTON_DATA)
  await confirmTransaction(seqNo3, adminWalletContract)

  console.log('Deposited liquidity to Ston.fi V2')
}

main().catch(console.error)

async function confirmTransaction(seqNo: number, walletContract: OpenedContract<WalletContractV4>) {
  let currentSeqno = seqNo

  while (currentSeqno == seqNo) {
    console.log('waiting for transaction to confirm...')
    await sleep(1500)
    currentSeqno = await walletContract.getSeqno()
  }

  console.log('Transaction confirmed!')
}
