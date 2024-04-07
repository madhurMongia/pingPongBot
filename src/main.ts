import PersistenceModule from './PersistenceModule';
import ProviderManager from './ProviderManger';
import config, { BotState, TransactionStatus } from './config';
import ContractInteractionModule from './contract/contractManager';

async function main() {
  console.log("Initializing bot...");

  const providerUrls = [
    `${config.ALCHEMY_NODE_ENDPOINT}/${config.ALCHEMY_PRIVATE_KEY}`,
    `${config.CHAINSTACK_NODE_ENDPOINT}/${config.CHAINSTACK_PRIVATE_KEY}`,
    config.PUBLIC_NODE_ENDPOINT,
  ];

  const providerManager = new ProviderManager(providerUrls);
  let provider = null;

  while (!provider) {
    try {
      provider = await providerManager.getProvider();
    } catch (error) {
      console.error("No provider available. Retrying in 10 seconds...");
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  const storage = new PersistenceModule('/storage');
  const contract = new ContractInteractionModule(provider, storage, config);

  let state: BotState;
  const currentBlock = await provider.getBlockNumber();
  state = storage.loadState<BotState>(config.BOT_STATE_KEY, {
    lastProcessedBlock: currentBlock,
    lastProcessedEventIndex: 0,
  });
  console.log(`Bot state loaded:`, state);

  if (state.pendingTxn && state.pendingTxn.status !== TransactionStatus.Mined) {
    console.log(`Waiting for pending transaction ${state.pendingTxn.txnHash} to be mined...`);
    const txReceipt = await provider.waitForTransaction(state.pendingTxn.txnHash);
    if (txReceipt.status === 1) {
      console.log(`Pending transaction ${state.pendingTxn.txnHash} was successfully mined`);
      state.pendingTxn.status = TransactionStatus.Mined;
    } else {
      await contract.callPong(state.pendingTxn.hash);
    }
  }
  provider.on(config.NEW_BLOCK_EVENT, async (blockNumber) => {
    console.log(`New block detected: ${blockNumber}`);
    const events = await contract.getFilterEvents(state.lastProcessedBlock, blockNumber);
    console.log(`Number of events found ${events.length}`);
    for (let i = state.lastProcessedEventIndex; i < events.length; i++) {
      const event = events[i];
      console.log(`Ping event found in block ${event.blockNumber}, txHash=${event.transactionHash}`);
      await contract.callPong(event.transactionHash);
      state.lastProcessedEventIndex = i + 1;
    }
    state.lastProcessedBlock = blockNumber;
  });
}

main().then(() => {
  console.log(`Bot started successfully.`);
}).catch((error) => {
  console.error(`Error starting bot:`, error);
});
