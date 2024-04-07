import { ethers } from 'ethers';
import PersistenceModule from '../PersistenceModule';
import { BotState, Config, TransactionStatus } from '../config';
import ContractABI from './PingPongABI.json';

class ContractInteractionModule {
    private contract: ethers.Contract;
    private wallet: ethers.Wallet;
    private config: Config;
    private persistenceModule: PersistenceModule;

    constructor(provider: ethers.providers.JsonRpcProvider, persistenceModule: PersistenceModule, config: Config) {
        this.wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
        this.contract = new ethers.Contract(config.CONTRACT_ADDRESS, ContractABI, this.wallet);
        this.config = config;
        this.persistenceModule = persistenceModule;

    }

    public async callPong(transactionHash: string): Promise<ethers.ContractTransaction> {
        const state = this.persistenceModule.getState<BotState>(this.config.BOT_STATE_KEY);

        const sendTransaction = async (
            hash: string,
            retries = 0,
            gasPrice?: ethers.BigNumber
        ): Promise<ethers.ContractTransaction> => {
            let tx;
            const nonce = await this.wallet.getTransactionCount();
            const gasLimit = await this.contract.estimateGas.pong(hash);
            console.log(`using gas limit ${hash}: ${gasLimit}`);
            if (!gasPrice)
                gasPrice = await this.calculateGasPrice(gasLimit);
            try {
                tx = await this.contract.pong(hash, { gasLimit, nonce, gasPrice });
                state.pendingTxn = { txnHash: tx.hash, nonce, status: TransactionStatus.Pending, hash };
                await tx.wait();
                state.pendingTxn = { txnHash: tx.hash, nonce, status: TransactionStatus.Mined, hash };
                console.log(`Sent pong transaction for hash ${hash}: ${tx.hash}`);
                return tx;
            } catch (error: any) {
                if (retries < this.config.MAX_RETRIES) {
                    const delay = 2 ** retries * 1000; // Exponential backoff
                    console.log(`Retrying pong transaction for hash ${hash} in ${delay / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    gasPrice.mul(ethers.utils.parseEther('1.2'));
                    return sendTransaction(hash, retries + 1, gasPrice);
                } else {
                    state.pendingTxn = { txnHash: error.transaction.hash, nonce, status: TransactionStatus.Failed, hash };
                    console.error(`Failed to send pong transaction for hash ${hash} after ${this.config.MAX_RETRIES} retries: ${error.message}`);
                    process.exit(1);
                }
            }
        };

        const transaction = await sendTransaction(transactionHash);
        return transaction;
    }

    public async getFilterEvents(fromBlock: number, toBlock: number): Promise<ethers.Event[]> {
        const events = await this.contract.queryFilter(this.config.PING_EVENT, fromBlock, toBlock);
        return events;
    }

    private async calculateGasPrice(gasLimit: ethers.BigNumber): Promise<ethers.BigNumber> {
        const balance = await this.wallet.getBalance();
        const currentGasPrice = await this.wallet.provider.getGasPrice();
        const transactionCost = currentGasPrice.mul(gasLimit);
        const maxTransactions = balance.div(transactionCost);

        let multiplier: number;
        if (maxTransactions.lte(this.config.LOW_TX_COUNT))
            multiplier = this.config.MIN_GAS_PRICE_MULTIPLIER;
        else if (maxTransactions.gte(this.config.HIGH_TX_COUNT))
            multiplier = this.config.MAX_GAS_PRICE_MULTIPLIER;
        else {
            const range = this.config.MAX_GAS_PRICE_MULTIPLIER - this.config.MIN_GAS_PRICE_MULTIPLIER;
            const factor = maxTransactions.sub(this.config.LOW_TX_COUNT).toNumber() / this.config.LOW_TX_COUNT;
            multiplier = this.config.MIN_GAS_PRICE_MULTIPLIER + range * factor;
        }
        let gasPrice = currentGasPrice.mul(ethers.BigNumber.from(Math.floor(multiplier * 100))).div(100);
        console.log(gasPrice.toNumber())
        return gasPrice;
    }



}

export default ContractInteractionModule;

