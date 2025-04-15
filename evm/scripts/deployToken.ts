import 'dotenv/config'
import { ethers } from 'ethers'
import { DexType, TokenFactorySDK } from '../src'

const TESTNET = true

const RPC_URL = TESTNET ? 'https://data-seed-prebsc-1-s1.binance.org:8545/' : 'https://bsc-dataseed.bnbchain.org'
const PRIVATE_KEY = process.env.DEPLOY_TOKEN_PRIVATE_KEY
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS

const TOKEN_PARAMS = {
  dexType: DexType.PANCAKE,
  name: 'Test Token 3',
  symbol: 'T3T',
  tokenURI: 'https://example.com/token-metadata.json',
  hasAgent: false,
  customPayload: '0x', // Empty payload
}

const INITIAL_BUY_AMOUNT = ethers.parseEther('0.02')
// const INITIAL_BUY_AMOUNT = 0n

async function main() {
  if (!PRIVATE_KEY) {
    console.error('Error: DEPLOY_TOKEN_PRIVATE_KEY environment variable not set')
    process.exit(1)
  }

  if (!FACTORY_ADDRESS) {
    console.error('Error: FACTORY_ADDRESS environment variable not set')
    process.exit(1)
  }

  console.log(`Factory Address: ${FACTORY_ADDRESS}`)

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const signer = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log(`Signer Address: ${signer.address}`)

  const balance = await provider.getBalance(signer.address)
  console.log(`Signer Balance: ${ethers.formatEther(balance)} BNB`)

  const tokenFactory = new TokenFactorySDK(FACTORY_ADDRESS, RPC_URL)

  console.log('\nFetching fee configuration...')
  const feeConfig = await tokenFactory.getFeeConfig()
  console.log(`Deploy Fee: ${ethers.formatEther(feeConfig.deployFee)} BNB`)
  console.log(`Agent Deploy Fee: ${ethers.formatEther(feeConfig.agentDeployFee)} BNB`)
  console.log(`Buy Fee: ${Number(feeConfig.buyFeeBasis) / 100}%`)
  console.log(`Sell Fee: ${Number(feeConfig.sellFeeBasis) / 100}%`)

  const deployFee = feeConfig.deployFee
  const agentFee = TOKEN_PARAMS.hasAgent ? feeConfig.agentDeployFee : 0n
  const totalValue = deployFee + agentFee + INITIAL_BUY_AMOUNT

  console.log(`\nTotal Required: ${ethers.formatEther(totalValue)} BNB`)
  console.log(`- Base Deploy Fee: ${ethers.formatEther(deployFee)} BNB`)
  if (TOKEN_PARAMS.hasAgent) {
    console.log(`- Agent Fee: ${ethers.formatEther(agentFee)} BNB`)
  }
  console.log(`- Initial Buy: ${ethers.formatEther(INITIAL_BUY_AMOUNT)} BNB`)

  if (balance < totalValue) {
    console.error(
      `Error: Insufficient balance. Need ${ethers.formatEther(totalValue)} BNB but have ${ethers.formatEther(balance)} BNB`,
    )
    process.exit(1)
  }

  const txData = tokenFactory.createDeployTokenTx(TOKEN_PARAMS, totalValue)

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
