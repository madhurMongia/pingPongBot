import { ethers } from 'ethers';
import PersistenceModule from '../PersistenceModule';
import ProviderManager from '../ProviderManger';


interface ContractInteractionModuleConfig {
    contractAddress: string;
    contractABI: ethers.ContractInterface;
    privateKey: string;
    maxRetries: number;
    confirmations: number;
    gasLimit: ethers.BigNumberish;
    persistenceModule: PersistenceModule;
}

class ContractInteractionModule {
    private contract: ethers.Contract;
    private wallet: ethers.Wallet;
    private maxRetries: number;
    private confirmations: number;
    private gasLimit: ethers.BigNumberish;
    private nonces: { [address: string]: number } = {};
    private persistenceModule: PersistenceModule;
    private readonly nonceStateKey = 'nonce-state';
    private pendingTransactions: {
        [hash: string]: {
            nonce: number;
            retries: number;
            gasPrice?: ethers.BigNumberish;
        };
    } = {};

    constructor(provider: ethers.providers.JsonRpcProvider, config: ContractInteractionModuleConfig) {
        this.wallet = new ethers.Wallet(config.privateKey, provider);
        this.contract = new ethers.Contract(config.contractAddress, config.contractABI, this.wallet);
        this.maxRetries = config.maxRetries;
        this.confirmations = config.confirmations;
        this.gasLimit = config.gasLimit;
        this.persistenceModule = config.persistenceModule;
    }

    public async callPong(transactionHash: string): Promise<ethers.ContractTransaction> {
        const nonce = await this.getNonce(this.wallet.address);
        this.pendingTransactions[transactionHash] = { nonce, retries: 0 };

        const sendTransaction = async (
            hash: string,
            retries = 0,
            gasPrice?: ethers.BigNumberish
        ): Promise<ethers.ContractTransaction> => {
            try {
                const tx = await this.contract.pong(hash, { gasLimit: this.gasLimit, nonce, gasPrice });
                await tx.wait(this.confirmations);
                console.log(`Sent pong transaction for hash ${hash}: ${tx.hash}`);
                delete this.pendingTransactions[hash];
                return tx;
            } catch (error: any) {
                if (retries < this.maxRetries && error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                    const gasLimit = error.gasLimit * 1.2; // Increase gas limit by 20%
                    return sendTransaction(hash, retries + 1, gasLimit);
                } else if (retries < this.maxRetries) {
                    const delay = 2 ** retries * 1000; // Exponential backoff
                    console.log(`Retrying pong transaction for hash ${hash} in ${delay / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return sendTransaction(hash, retries + 1, gasPrice);
                } else {
                    console.error(`Failed to send pong transaction for hash ${hash} after ${this.maxRetries} retries: ${error}`);
                    delete this.pendingTransactions[hash];
                    throw error;
                }
            }
        };

        const transaction = await sendTransaction(transactionHash);
        return transaction;
    }

    private async getNonce(address: string): Promise<number> {
        const nonces = await this.persistenceModule.loadState<{ [address: string]: number }>(this.nonceStateKey, {}) || {};
        if (!nonces[address]) {
            nonces[address] = await this.wallet.getTransactionCount();
        }
        const nonce = nonces[address];
        nonces[address]++;
        await this.persistenceModule.saveState(this.nonceStateKey, nonces);
        return nonce;
    }

    public async processQueue(): Promise<void> {
        const wallet = this.wallet;
        const contract = this.contract;
        const gasLimit = this.gasLimit;
        const maxRetries = this.maxRetries;
        const confirmations = this.confirmations;

        const nonce = await this.getNonce(wallet.address);
        const pendingTransactions = Object.entries(this.pendingTransactions)
            .filter(([_, { nonce: txNonce }]) => txNonce < nonce)
            .sort(([_, { nonce: a }], [__, { nonce: b }]) => a - b)
            .map(([hash, { retries, gasPrice }]) => ({ hash, retries, gasPrice }));

        for (const { hash, retries, gasPrice } of pendingTransactions) {
            try {
                const tx = await contract.pong(hash, { gasLimit, nonce: this.pendingTransactions[hash].nonce, gasPrice });
                await tx.wait(confirmations);
                console.log(`Sent pong transaction for hash ${hash}: ${tx.hash}`);
                delete this.pendingTransactions[hash];
            } catch (error) {
                console.error(`Error sending pong transaction for hash ${hash}:`, error);
            }
        }
    }
}

export default ContractInteractionModule;