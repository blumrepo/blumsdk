/**
 * Transaction data that can be used with any web3 provider
 */
export interface TransactionData {
  to: string
  data: string
  value?: bigint
}
