import { AccountStatus, Api, ApiConfig, TonApiClient } from '@ton-api/client'
import { ContractAdapter } from '@ton-api/ton-adapter'
import { Address, Contract, OpenedContract } from '@ton/core'

export class TonApiClientWrapper {
  private readonly api: Api<unknown>
  private readonly adapter: ContractAdapter

  constructor(apiConfig: ApiConfig<unknown>) {
    const tonApiClient = new TonApiClient(apiConfig)

    this.api = new Api(tonApiClient)
    this.adapter = new ContractAdapter(this.api)
  }

  open<T extends Contract>(contract: T): OpenedContract<T> {
    return this.adapter.open(contract)
  }

  async isContractDeployed(address: Address): Promise<boolean> {
    let account = await this.api.accounts.getAccount(address)
    return account.status === AccountStatus.Active
  }

  async getAccountBalance(address: Address): Promise<bigint> {
    let account = await this.api.accounts.getAccount(address)
    return account.balance
  }
}
