import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, toNano } from '@ton/core';

import { Fee, Op } from './JettonConstants';

export type MemeJettonMinterContent = {
    type: 0 | 1,
    uri: string
};

export type MemeJettonMinterConfig = { admin: Address; content: Cell; walletCode: Cell };

export function jettonMinterConfigToCell(config: MemeJettonMinterConfig): Cell {
    return beginCell()
      .storeCoins(0)
      .storeAddress(config.admin)
      .storeRef(config.content)
      .storeRef(config.walletCode)
      .storeAddress(null)
      .endCell();
}

export class MemeJettonMinter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new MemeJettonMinter(address);
    }

    static createFromConfig(config: MemeJettonMinterConfig, code: Cell, workchain = 0) {
        const data = jettonMinterConfigToCell(config);
        const init = { code, data };
        return new MemeJettonMinter(contractAddress(workchain, init), init);
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }]);
        return res.stack.readAddress();
    }

    async getJettonData(provider: ContractProvider) {
        let res = await provider.get('get_jetton_data', []);
        let totalSupply = res.stack.readBigNumber();
        let mintable = res.stack.readBoolean();
        let adminAddress = res.stack.readAddress();
        let content = res.stack.readCell();
        let walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode
        };
    }

    async getTotalSupply(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.totalSupply;
    }

    async getAdminAddress(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.adminAddress;
    }

    async getContent(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.content;
    }

    async getMinterAddress(provider: ContractProvider) {
        let res = await provider.get('get_minter_address', []);
        return res.stack.readAddressOpt();
    }

    async getBalance(provider: ContractProvider) {
        return (await provider.getState()).balance;
    }

    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: Fee.buyFee,
            body: beginCell().endCell()
        });
    }

    async sendBuy(provider: ContractProvider, via: Sender, value: bigint, queryId: number = 0) {
        await provider.internal(via, {
            value: value + Fee.buyFee,
            body: beginCell()
              .storeUint(Op.buy, 32)
              .storeUint(queryId, 64)
              .storeCoins(value)
              .endCell()
        });
    }

    async sendDeployMinter(provider: ContractProvider, via: Sender, value: bigint, minterCode: Cell, content: Cell, queryId: number = 0) {
        await provider.internal(via, {
            value: value,
            body: beginCell()
              .storeUint(Op.deploy_real_master_contract, 32)
              .storeUint(queryId, 64)
              .storeRef(minterCode)
              .storeRef(content)
              .endCell()
        });
    }

    async sendWithdraw(provider: ContractProvider, via: Sender, value: bigint, queryId: number = 0) {
        await provider.internal(via, {
            value: value,
            body: beginCell()
              .storeUint(Op.withdraw_ton, 32)
              .storeUint(queryId, 64)
              .endCell()
        });
    }

    async sendDepositLiquidityToDeDust(provider: ContractProvider, via: Sender, value: bigint, tonVaultAddress: Address, jettonVaultAddress: Address, minterContractAddress: Address, queryId: number = 0) {
        await provider.internal(via, {
            value: value,
            body: beginCell()
              .storeUint(Op.deposit_liquidity_to_de_dust, 32)
              .storeUint(queryId, 64)
              .storeRef(beginCell()
                .storeAddress(tonVaultAddress)
                .storeAddress(jettonVaultAddress)
                .storeAddress(minterContractAddress)
                .endCell()
              )
              .storeBuffer(minterContractAddress.hash)
              .endCell()
        });
    }

    async sendDepositLiquidityToStonFi(provider: ContractProvider, via: Sender, value: bigint, routerAddress: Address, pTonWalletOfRouterAddress: Address, jettonWalletOfRouterAddress: Address, minterContractAddress: Address, deadline: number, queryId: number = 0) {
        await provider.internal(via, {
            value: value,
            body: beginCell()
              .storeUint(Op.deposit_liquidity_to_ston_fi, 32)
              .storeUint(queryId, 64)
              .storeRef(beginCell()
                .storeAddress(routerAddress)
                .storeAddress(pTonWalletOfRouterAddress)
                .storeAddress(jettonWalletOfRouterAddress)
                .endCell()
              )
              .storeAddress(minterContractAddress)
              .storeUint(deadline, 64)
              .endCell()
        });
    }

    async sendTransferNotification(provider: ContractProvider, via: Sender, value: bigint, jettonAmount: bigint, fromAddress: Address, queryId: number = 0) {
        await provider.internal(via, {
            value: value,
            bounce: false,
            body: beginCell()
              .storeUint(Op.transfer_notification, 32)
              .storeUint(queryId, 64)
              .storeCoins(jettonAmount)
              .storeAddress(fromAddress)
              .storeMaybeRef(null)
              .endCell()
        });
    }

    async sendNullifyAdmin(provider: ContractProvider, via: Sender, value: bigint, queryId: number = 0) {
        await provider.internal(via, {
            value: value,
            body: beginCell()
              .storeUint(Op.nullify_admin, 32)
              .storeUint(queryId, 64)
              .endCell()
        });
    }

    async sendDiscovery(provider: ContractProvider, via: Sender, owner: Address, include_address: boolean, value: bigint = toNano('0.1'), queryId: number = 0) {
        await provider.internal(via, {
            value: value,
            body: beginCell()
              .storeUint(0x2c76b973, 32)
              .storeUint(queryId, 64)
              .storeAddress(owner)
              .storeBit(include_address)
              .endCell()
        });
    }

    async sendChangeAdmin(provider: ContractProvider, via: Sender, newOwner: Address, queryId: number = 0) {
        await provider.internal(via, {
            value: toNano('0.05'),
            body: beginCell()
              .storeUint(Op.change_admin, 32)
              .storeUint(queryId, 64)
              .storeAddress(newOwner)
              .endCell()
        });
    }

    async sendChangeContent(provider: ContractProvider, via: Sender, content: Cell, queryId: number = 0) {
        await provider.internal(via, {
            value: toNano('0.05'),
            body: beginCell()
              .storeUint(Op.change_content, 32)
              .storeUint(queryId, 64)
              .storeRef(content)
              .endCell()
        });
    }
}
