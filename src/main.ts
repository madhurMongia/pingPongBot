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
  let newBlockArray: number[] = [];
  const seenEvents = new Set();
  let processingBlocks = false;

  // Create instances of the ProviderManager, PersistenceModule, and ContractInteractionModule
  let provider = await new ProviderManager(providerUrls).getProvider();
  const storage = new PersistenceModule();
  const contract = new ContractInteractionModule(provider, storage, config);

  // Load the bot state from storage or initialize it with default values
  let state: BotState;
  const currentBlock = await provider.getBlockNumber();
  state = storage.getState<BotState>(config.BOT_STATE_KEY, {
    lastProcessedBlock: currentBlock,
    lastProcessedEventIndex: 0,
  });
  console.log(`Bot state loaded:`, state);

  // Check for pending transactions and wait for them to be mined
  if (state.pendingTxn && state.pendingTxn.status !== TransactionStatus.Mined) {
    console.log(`Waiting for pending transaction ${state.pendingTxn.txnHash} to be mined...`);
    const txReceipt = await provider.waitForTransaction(state.pendingTxn.txnHash);
    if (txReceipt.status === 1) {
      console.log(`Pending transaction ${state.pendingTxn.txnHash} was successfully mined`);
      state.pendingTxn.status = TransactionStatus.Mined;
    } else {
      await contract.callPong(state.pendingTxn.hash);
    }
    state.lastProcessedEventIndex = state.lastProcessedEventIndex + 1;
    delete state.pendingTxn;
  }

  // Process new blocks from the last processed block to the current block
  newBlockArray = Array.from({ length: currentBlock - state.lastProcessedBlock + 1 }, (_, i) => state.lastProcessedBlock + i + 1);
  processingBlocks = true;
  await processNewBlockArray();

  // Set up a listener for new block events
  provider.on(config.NEW_BLOCK_EVENT, async (blockNumber: number) => {
    newBlockArray.push(blockNumber);
    if (!processingBlocks) {
      processingBlocks = true;
      await processNewBlockArray();
    }
  });

  async function processNewBlockArray() {
    // Process new blocks and events
    while (newBlockArray.length > 0) {
      const blockNumber = newBlockArray.shift()!;
      console.log(`New block detected: ${blockNumber}`);

      // Get events for the current block
      const events = await contract.getFilterEvents(blockNumber, blockNumber);

      // Process events starting from the last processed event index
      for (let i = state.lastProcessedEventIndex + 1; i < events.length; i++) {
        const event = events[i];
        if (seenEvents.has(event.transactionHash)) continue;

        console.log(`Ping event found in block ${event.blockNumber}, txHash=${event.transactionHash}`);
        await contract.callPong(event.transactionHash);
        seenEvents.add(event.transactionHash);
        state.lastProcessedEventIndex = i;
      }

      // Update the bot state with the last processed block and event index
      state.lastProcessedBlock = blockNumber;
      state.lastProcessedEventIndex = -1;
    }
    processingBlocks = false;
  }
}

function startBot() {
  // Start the bot and handle errors
  let restartsleft = config.MAX_BOT_RESTART_ATTEMPTS;
  main()
    .then(() => {
      console.log(`Bot started successfully.`);
    })
    .catch((error) => {
      console.log(`bot failed with error: ${error.message}`);
      if (restartsleft <= 0) {
        console.log(`maximum restart attempts reached ,manual restart required`);
        return;
      }
      if (error.message !== 'No available providers')
        restartsleft--;
      console.error(`Restarting bot in 10 seconds...`);
      setTimeout(startBot, 10000);
    });
}

startBot();

