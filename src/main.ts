import PersistenceModule from './PersistenceModule';
import config, { BotState } from './config';
import ProviderManager from './ProviderManger';
import ContractInteractionModule from './contract/contractManager';

async function main() {
  const providerManager = new ProviderManager([config.PROVIDER_URL]);
  const provider = await providerManager.getProvider();
  const storage = new PersistenceModule('/storage');
  const contract = new ContractInteractionModule(provider,storage,config);
  let state : any;
  const currentBlock =  await provider.getBlockNumber();
  state = await storage.loadState<BotState>(config.BOT_STATE_KEY, {
    lastProcessedBlock : currentBlock,
    lastProcessedEventIndex: 0,
    pendingTxn : {}
  });
  console.log(`Starting from state ${state}`);

  provider.on(config.NEW_BLOCK_EVENT, async (blockNumber) => {
    const events = await contract.getFilterEvents(state.lastProcessedBlock,blockNumber);
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
  console.log(`starting bot`);
}).catch((error)=>{
  console.error(error, `bot down`);
})