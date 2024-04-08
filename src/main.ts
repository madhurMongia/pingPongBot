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
  let newBlockArray: number[] = [];
  const seenEvents = new Set();
  let processingBlocks = false;
  provider = await providerManager.getProvider();

  const storage = new PersistenceModule();
  const contract = new ContractInteractionModule(provider, storage, config);
  let state: BotState;
  const currentBlock = await provider.getBlockNumber();
  state = storage.getState<BotState>(config.BOT_STATE_KEY, {
    lastProcessedBlock: currentBlock,
    lastProcessedEventIndex: 0,
  });
  console.log(`Bot state loaded:`, state);

  if (state.pendingTxn && state.pendingTxn.status!== TransactionStatus.Mined) {
    console.log(`Waiting for pending transaction ${state.pendingTxn.txnHash} to be mined...`);
    const txReceipt = await provider.waitForTransaction(state.pendingTxn.txnHash);
    if (txReceipt.status === 1) {
      console.log(`Pending transaction ${state.pendingTxn.txnHash} was successfully mined`);
      state.pendingTxn.status = TransactionStatus.Mined;
    } else {
      await contract.callPong(state.pendingTxn.hash);
    }
  }
   newBlockArray = Array.from({length: currentBlock - state.lastProcessedBlock + 1}, (_, i) => state.lastProcessedBlock + i +1);
   processingBlocks = true;
   processNewBlockArray();
  provider.on(config.NEW_BLOCK_EVENT, (blockNumber) => {
    newBlockArray.push(blockNumber);
    if (!processingBlocks) {
      processingBlocks = true;
      processNewBlockArray();
    }
  });

  async function processNewBlockArray() {
    while (newBlockArray.length > 0) {
      const blockNumber = newBlockArray.shift()!;
      console.log(`New block detected: ${blockNumber}`);
      const events = await contract.getFilterEvents(blockNumber, blockNumber);

      for (let i = state.lastProcessedEventIndex +1; i < events.length; i++) {
        const event = events[i];
        if(seenEvents.has(event.transactionHash)) continue;
        console.log(`Ping event found in block ${event.blockNumber}, txHash=${event.transactionHash}`);
        await contract.callPong(event.transactionHash);
        seenEvents.add(event.transactionHash);
        state.lastProcessedEventIndex = i ;
      }
      state.lastProcessedBlock = blockNumber;
      state.lastProcessedEventIndex = 0;
    }
    processingBlocks = false;
  }
}

function startBot() {
  let restartsleft = 5;
  main()
   .then(() => {
      console.log(`Bot started successfully.`);
    })
   .catch((error) => {
    console.log(`bot failed with error: ${error.message}`);
    if(restartsleft <=0) {
      console.log(`maximum restart attempts reached ,manual restart required`);
      return;
    }
      if (error.message !== 'No available providers') 
        restartsleft--;
        console.error(`No provider available. Restarting bot in 10 seconds...`);
        setTimeout(startBot, 10000);
    });
}

startBot();