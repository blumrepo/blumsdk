import { Address, fromNano, OpenedContract, toNano } from '@ton/core'
import { BlumSdk } from '../dist'
import { mnemonicToWalletKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { TonApiClientWrapper } from '../src/api/ton-client-api-wrapper'
import { sleep } from '@ton-community/assets-sdk/dist/utils'

async function main() {
  // Configuration

  const TESTNET = true

  const TONAPI_API_KEY = null
  const BUYER_MNEMONIC = ''
  const MEME_JETTON_ADDRESS = ''

  const BUY_AMOUNT = toNano(10)
  const SELL_AMOUNT = toNano(5)

  // Script body

  const client = new TonApiClientWrapper({
    baseUrl: TESTNET ? 'https://testnet.tonapi.io' : 'https://tonapi.io',
    apiKey: TONAPI_API_KEY,
  })

  const buyerKey = await mnemonicToWalletKey(BUYER_MNEMONIC.split(' '))
  const buyerWallet = WalletContractV4.create({
    publicKey: buyerKey.publicKey,
    workchain: 0,
  })

  console.log('Buyer Address: ' + buyerWallet.address.toString({ testOnly: TESTNET, bounceable: false }))

  if (!(await client.isContractDeployed(buyerWallet.address))) {
    return console.log('Buyer wallet is not deployed')
  }

  const buyerWalletContract = client.open(buyerWallet)
  const buyerSender = buyerWalletContract.sender(buyerKey.secretKey)
  const buyerBalance = await buyerWalletContract.getBalance()

  console.log('Buyer Balance:', fromNano(buyerBalance))

  const sdk = new BlumSdk(TONAPI_API_KEY, TESTNET)

  const jettonAddress = Address.parse(MEME_JETTON_ADDRESS)

  if (!(await client.isContractDeployed(jettonAddress))) {
    console.log('MemeJettonMinter contract is not deployed')
    return
  } else {
    console.log('MemeJettonMinter contract: ' + jettonAddress.toString({ testOnly: TESTNET, bounceable: true }))
  }

  // Buy meme jettons by User

  const expectedJettonAmount = sdk.getBuyAmount(await sdk.getTotalSupply(jettonAddress), BUY_AMOUNT)

  const seqNo = await buyerWalletContract.getSeqno()
  await sdk.sendBuy(buyerSender, jettonAddress, BUY_AMOUNT, expectedJettonAmount)
  await confirmTransaction(seqNo, buyerWalletContract)

  console.log('Buyer tried to buy ' + fromNano(BUY_AMOUNT) + ' meme tokens')

  // Sell meme jettons by User

  const jettonWalletAddress = await sdk.getWalletAddress(jettonAddress, buyerWallet.address)

  const seqNo2 = await buyerWalletContract.getSeqno()
  await sdk.sendSell(buyerSender, jettonWalletAddress, buyerWallet.address, SELL_AMOUNT, 0n)
  await confirmTransaction(seqNo2, buyerWalletContract)

  console.log('Buyer tried to sell ' + fromNano(SELL_AMOUNT) + ' meme tokens')
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
