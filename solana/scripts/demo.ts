import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js'
import * as bip39 from 'bip39'
import { AnchorProvider, Wallet } from '@coral-xyz/anchor'
import {
  createAssociatedTokenAccountIdempotent,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { BlumSolSdk } from '../dist/src'
import { CURVE_A, TOKEN_DECIMALS, TOKEN_THRESHOLD } from '../dist/src/constants'

// Configuration

// const ENDPOINT = clusterApiUrl('mainnet-beta')
// const ENDPOINT = clusterApiUrl('devnet')
const ENDPOINT = 'http://127.0.0.1:8899'

const CREATOR_MNEMONIC = 'park combine option relief tongue afford prison warm now frog appear agree'
const BUYER_MNEMONIC = 'volcano assume bacon thumb bleak connect phrase giraffe reward develop kitten next'
const PARTNER_ADDRESS = new PublicKey('H5mXyZXw1pj8XZfF1kwGHAVAzkEhasxs16YymGwoSaoZ')

const METADATA = {
  name: 'Solana Gold',
  symbol: 'GOLDSOL',
  uri: 'https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json',
}

async function main() {
  const creatorKeypair = Keypair.fromSeed(bip39.mnemonicToSeedSync(CREATOR_MNEMONIC).subarray(0, 32))
  console.log('Creator Address:', creatorKeypair.publicKey.toBase58())

  const buyerKeypair = Keypair.fromSeed(bip39.mnemonicToSeedSync(BUYER_MNEMONIC).subarray(0, 32))
  console.log('Buyer Address:', buyerKeypair.publicKey.toBase58())

  const connection = new Connection(ENDPOINT, 'confirmed')

  // const airdropTx = await connection.requestAirdrop(creatorKeypair.publicKey, 1000 * LAMPORTS_PER_SOL)
  // const airdropTx = await connection.requestAirdrop(buyerKeypair.publicKey, 1000 * LAMPORTS_PER_SOL)

  const creatorBalance = await connection.getBalance(creatorKeypair.publicKey)
  console.log('Creator Balance:', creatorBalance)

  const buyerBalance = await connection.getBalance(buyerKeypair.publicKey)
  console.log('Buyer Balance:', buyerBalance)

  const creatorWallet = new Wallet(creatorKeypair)
  const creatorProvider = new AnchorProvider(connection, creatorWallet)
  const creatorSdk = new BlumSolSdk(creatorProvider, CURVE_A)

  const buyerWallet = new Wallet(buyerKeypair)
  const buyerProvider = new AnchorProvider(connection, buyerWallet)
  const buyerSdk = new BlumSolSdk(buyerProvider, CURVE_A)

  // Create token and initial buy

  const mintKeypair = new Keypair()
  console.log('Mint address:', mintKeypair.publicKey.toBase58())

  const createTokenIx = await creatorSdk.createTokenInstruction(
    mintKeypair.publicKey,
    METADATA.name,
    METADATA.symbol,
    METADATA.uri,
  )

  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    creatorKeypair.publicKey,
    getAssociatedTokenAddressSync(mintKeypair.publicKey, creatorKeypair.publicKey),
    creatorKeypair.publicKey,
    mintKeypair.publicKey,
  )

  const buyIx = await creatorSdk.buyInstruction(mintKeypair.publicKey, 10n * BigInt(LAMPORTS_PER_SOL), 0n, {
    partner: PARTNER_ADDRESS,
  })

  const createTokenTx = new Transaction().add(createTokenIx, ataIx, buyIx)
  const createTokenTxSignature = await sendAndConfirmTransaction(
    connection,
    createTokenTx,
    [creatorKeypair, mintKeypair],
    {
      commitment: 'confirmed',
    },
  )

  console.log('Create token tx:', createTokenTxSignature)

  // Buy

  await createAssociatedTokenAccountIdempotent(connection, buyerKeypair, mintKeypair.publicKey, buyerKeypair.publicKey)
  await buy(buyerSdk, buyerProvider, buyerKeypair, mintKeypair.publicKey, 5n * BigInt(LAMPORTS_PER_SOL))
  await buy(buyerSdk, buyerProvider, buyerKeypair, mintKeypair.publicKey, 100n * BigInt(LAMPORTS_PER_SOL))

  // Sell

  const circulatingSupply = await buyerSdk.getCirculatingSupply(mintKeypair.publicKey)
  console.log('Circulating supply', circulatingSupply)

  const tokenAmount = toTokenValue(70_000_000n)
  const calculatedSolAmount = creatorSdk.getSolAmountForSell(circulatingSupply, tokenAmount)

  console.log('Attempting to sell', tokenAmount, 'tokens for', calculatedSolAmount, 'SOL')

  const sellIx = await creatorSdk.sellInstruction(mintKeypair.publicKey, tokenAmount, calculatedSolAmount, {
    partner: PARTNER_ADDRESS,
  })
  const sellTx = new Transaction().add(sellIx)
  const sellTxSignature = await buyerProvider.sendAndConfirm(sellTx, [creatorKeypair], { commitment: 'confirmed' })

  console.log('Sell tx:', sellTxSignature)
}

main().catch(console.error)

async function buy(
  sdk: BlumSolSdk,
  provider: AnchorProvider,
  userKeypair: Keypair,
  mintAddress: PublicKey,
  solAmount: bigint,
) {
  const circulatingSupply = await sdk.getCirculatingSupply(mintAddress)
  console.log('Circulating supply', circulatingSupply)
  const calculatedTokenAmount = sdk.getTokenAmountForBuy(circulatingSupply, TOKEN_THRESHOLD, solAmount)

  console.log('Attempting to buy', calculatedTokenAmount, 'tokens for', solAmount, 'SOL')

  const buyIx = await sdk.buyInstruction(mintAddress, solAmount, calculatedTokenAmount, { partner: PARTNER_ADDRESS })
  const buyTx = new Transaction().add(buyIx)
  const buyTxSignature = await provider.sendAndConfirm(buyTx, [userKeypair], { commitment: 'confirmed' })

  console.log('Buy tx:', buyTxSignature)
}

function toTokenValue(value: bigint) {
  return value * 10n ** BigInt(TOKEN_DECIMALS)
}
