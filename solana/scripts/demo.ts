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
import { BlumSolSdk } from '../src'
import { createAssociatedTokenAccountIdempotent, getAssociatedTokenAddress } from '@solana/spl-token'

async function main() {
  // Configuration

  // const ENDPOINT = clusterApiUrl('mainnet-beta')
  // const ENDPOINT = clusterApiUrl('devnet')
  const ENDPOINT = 'http://127.0.0.1:8899'

  const USER_MNEMONIC = 'gadget usual metal friend pill ankle balcony key husband call agent flight'

  const METADATA = {
    name: 'Solana Gold',
    symbol: 'GOLDSOL',
    uri: 'https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json',
  }

  // Script body

  const userKeypair = Keypair.fromSeed(bip39.mnemonicToSeedSync(USER_MNEMONIC).subarray(0, 32))
  console.log('User Address:', userKeypair.publicKey.toBase58())

  const connection = new Connection(ENDPOINT, 'confirmed')

  // const airdropTx = await connection.requestAirdrop(userKeypair.publicKey, 1000 * LAMPORTS_PER_SOL)
  // await confirmTransaction(connection, airdropTx, 'Airdrop')

  const balance = await connection.getBalance(userKeypair.publicKey)
  console.log('User Balance:', balance)

  const userWallet = new Wallet(userKeypair)
  const provider = new AnchorProvider(connection, userWallet)
  const sdk = new BlumSolSdk(provider)

  // Create token

  const mintKeypair = new Keypair()
  console.log('Mint address:', mintKeypair.publicKey.toBase58())

  const createTokenIx = await sdk.createTokenInstruction(
    mintKeypair.publicKey,
    METADATA.name,
    METADATA.symbol,
    METADATA.uri,
  )

  const createTokenTx = new Transaction().add(createTokenIx)
  const createTokenTxSignature = await sendAndConfirmTransaction(
    connection,
    createTokenTx,
    [userKeypair, mintKeypair],
    {
      commitment: 'confirmed',
    },
  )

  console.log('Create token tx:', createTokenTxSignature)

  // Buy

  await createAssociatedTokenAccountIdempotent(connection, userKeypair, mintKeypair.publicKey, userKeypair.publicKey)
  await buy(sdk, provider, userKeypair, mintKeypair.publicKey, 5n * BigInt(LAMPORTS_PER_SOL))

  // Sell

  const circulatingSupply = await sdk.getCirculatingSupply(mintKeypair.publicKey)
  console.log('Circulating supply', circulatingSupply)

  const tokenBalance = await connection.getTokenAccountBalance(
    await getAssociatedTokenAddress(mintKeypair.publicKey, userKeypair.publicKey),
  )
  const tokenAmount = BigInt(tokenBalance.value.amount)
  const solAmount = sdk.getSellSolAmount(circulatingSupply, tokenAmount)

  console.log('Attempting to sell', tokenAmount, 'tokens for', solAmount, 'SOL')

  const sellIx = await sdk.sellInstruction(mintKeypair.publicKey, tokenAmount, solAmount)
  const sellTx = new Transaction().add(sellIx)
  const sellTxSignature = await provider.sendAndConfirm(sellTx, [userKeypair], { commitment: 'confirmed' })

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
  const tokenAmount = sdk.getBuyTokenAmount(circulatingSupply, solAmount)

  console.log('Attempting to buy', tokenAmount, 'tokens for', solAmount, 'SOL')

  const buyIx = await sdk.buyInstruction(mintAddress, tokenAmount, solAmount)
  const buyTx = new Transaction().add(buyIx)
  const buyTxSignature = await provider.sendAndConfirm(buyTx, [userKeypair], { commitment: 'confirmed' })

  console.log('Buy tx:', buyTxSignature)
}
