import { ethers } from 'ethers';
import PersistenceModule from '../PersistenceModule';
import { BotState, Config, TransactionStatus } from '../config';
import ContractABI from './PingPongABI.json';

/**
 * A module for interacting with the PingPong contract.
 */
class ContractInteractionModule {
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;
  private config: Config;
  private persistenceModule: PersistenceModule;

  /**
   * Creates an instance of ContractInteractionModule.
   * @param {ethers.providers.JsonRpcProvider} provider - The Ethereum provider.
   * @param {PersistenceModule} persistenceModule - The persistence module for storing bot state.
   * @param {Config} config - The configuration object.
   * @throws {Error} If the private key is invalid.
   */
  constructor(provider: ethers.providers.JsonRpcProvider, persistenceModule: PersistenceModule, config: Config) {
    if (!config.PRIVATE_KEY.length)
      throw new Error("Invalid private key");
    this.wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
    this.contract = new ethers.Contract(config.CONTRACT_ADDRESS, ContractABI, this.wallet);
    this.config = config;
    this.persistenceModule = persistenceModule;
  }

  /**
   * Calls the pong function on the PingPong contract.
   * @param {string} transactionHash - The hash of the transaction to respond to.
   * @returns {Promise<ethers.ContractTransaction>} A Promise that resolves to the transaction receipt.
   */
  public async callPong(transactionHash: string): Promise<ethers.ContractTransaction> {
    const state = this.persistenceModule.getState<BotState>(this.config.BOT_STATE_KEY);

    /**
     * Sends the pong transaction with exponential backoff retries.
     * @param {string} hash - The hash of the transaction to respond to.
     * @param {number} [retries=0] - The number of retries attempted so far.
     * @param {ethers.BigNumber} [gasPrice] - The gas price to use for the transaction.
     * @returns {Promise<ethers.ContractTransaction>} A Promise that resolves to the transaction receipt.
     */
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
          const delay = 2 ** retries * 10000; // Exponential backoff
          console.log(`Retrying pong transaction for hash ${hash} in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          gasPrice.mul(ethers.utils.parseEther('1.2'));
          return sendTransaction(hash, retries + 1, gasPrice);
        } else {
          state.pendingTxn = { txnHash: error.transaction.hash, nonce, status: TransactionStatus.Failed, hash };
          console.error(`Failed to send pong transaction for hash ${hash} after ${this.config.MAX_RETRIES} retries: ${error.message}`);
          throw error;
        }
      }
    };

    const transaction = await sendTransaction(transactionHash);
    return transaction;
  }

  /**
   * Retrieves the filtered events from the PingPong contract.
   * @param {number} fromBlock - The start block number.
   * @param {number} toBlock - The end block number.
   * @returns {Promise<ethers.Event[]>} A Promise that resolves to an array of events.
   */
  public async getFilterEvents(fromBlock: number, toBlock: number): Promise<ethers.Event[]> {
    const events = await this.contract.queryFilter(this.config.PING_EVENT, fromBlock, toBlock);
    return events;
  }

  /**
   * Calculates the gas price based on the wallet balance and transaction cost.
   * @param {ethers.BigNumber} gasLimit - The gas limit for the transaction.
   * @returns {Promise<ethers.BigNumber>} A Promise that resolves to the calculated gas price.
   * @private
   */
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
    console.log(`Current gas price variables:`, {
      transactionCost: transactionCost.toString(),
      maxTransactions: maxTransactions.toString(),
      currentGasPrice: currentGasPrice.toString(),
      gasPrice: gasPrice.toString(),
      multiplier
    });
    return gasPrice;
  }
}

export default ContractInteractionModule;

