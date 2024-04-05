import { ethers } from 'ethers';
import PersistenceModule from './PersistenceModule';
import ContractInteractionModule from './contract/contractManager';
import ProviderManager from './ProviderManger';

interface EventListenerModuleConfig {
    contractAddress: string;
    contractABI: ethers.ContractInterface;
    lastProcessedBlockKey: string;
}

class EventListenerModule {
    private contract: ethers.Contract;
    private contractInteractionModule: ContractInteractionModule;
    private persistenceModule: PersistenceModule;
    private lastProcessedBlockKey: string;
    private eventListener: ethers.providers.Provider | null = null;

    constructor(
        provider: ethers.providers.JsonRpcProvider,
        contractInteractionModule: ContractInteractionModule,
        persistenceModule: PersistenceModule,
        config: EventListenerModuleConfig
    ) {
        this.contract = new ethers.Contract(config.contractAddress, config.contractABI, provider);
        this.contractInteractionModule = contractInteractionModule;
        this.persistenceModule = persistenceModule;
        this.lastProcessedBlockKey = config.lastProcessedBlockKey;
    }

    public async startListening(): Promise<void> {
        const lastProcessedBlock = await this.persistenceModule.loadState<number>(
            this.lastProcessedBlockKey,
            0
        ) || 0;
        const currentBlockNumber = await this.contract.provider.getBlockNumber();

        if (lastProcessedBlock < currentBlockNumber) {
            const fromBlock = lastProcessedBlock + 1;
            const toBlock = 'latest';
            const filter = this.contract.filters.Ping(null, fromBlock, toBlock);
            const pastEvents = await this.contract.queryFilter(filter);
            await this.processPastEvents(pastEvents);
            console.log(`Listening for events from block ${fromBlock}`);
        }

        this.eventListener = this.contract.provider;
        console.log('Caught up with past events. Listening for new events...');
    }

    private async handlePingEvent(transactionHash: string, ...args: any[]): Promise<void> {
        try {
            const tx = await this.contractInteractionModule.callPong(transactionHash);
            console.log(`Processed Ping event in block ${tx.blockNumber}`);
        } catch (error) {
            console.error(`Error processing Ping event with hash ${transactionHash}:`, error);
        }
    }

    private async processPastEvents(events: any): Promise<void> {
        for (const event of events) {
            const { hash } = event.args;
            await this.handlePingEvent(hash);
        }
    }

    public stopListening(): void {
        if (this.eventListener) {
            this.contract.off('Ping', this.handlePingEvent.bind(this));
            this.eventListener = null;
        }
    }
}

export default EventListenerModule;