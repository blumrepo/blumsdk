import 'dotenv/config'
import { ethers } from 'ethers'
import { BondingCurveTokenSDK, TokenFactorySDK } from '../src'

const TESTNET = true

const RPC_URL = TESTNET ? 'https://data-seed-prebsc-1-s1.binance.org:8545/' : 'https://bsc-dataseed.bnbchain.org'
const PRIVATE_KEY = process.env.TRADE_TOKEN_PRIVATE_KEY
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS

async function main() {
  if (!PRIVATE_KEY) {
    console.error('Error: TRADE_TOKEN_PRIVATE_KEY environment variable not set')
    process.exit(1)
  }

  if (!TOKEN_ADDRESS) {
    console.error('Error: TOKEN_ADDRESS environment variable not set')
    process.exit(1)
  }

  console.log(`Token Address: ${TOKEN_ADDRESS}`)

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const signer = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log(`Signer Address: ${signer.address}`)

  const balance = await provider.getBalance(signer.address)
  console.log(`Signer Balance: ${ethers.formatEther(balance)} BNB`)

  const token = new BondingCurveTokenSDK(TOKEN_ADDRESS, RPC_URL)

  const tokenBalance = await token.getBalanceOf(signer.address)
  console.log(`Token Balance: ${ethers.formatEther(tokenBalance)}`)

  const txData = token.createSellTx(tokenBalance, 0n)

  console.log('\nSending transaction...')
  const tx = await signer.sendTransaction({
    to: txData.to,
    data: txData.data,
    value: txData.value,
  })

  console.log(`Transaction sent! Hash: ${tx.hash}`)
  console.log(`Explorer Link: https://testnet.bscscan.com/tx/${tx.hash}`)
}

main().catch(console.error)
