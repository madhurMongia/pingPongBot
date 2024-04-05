import { ethers } from 'ethers';

class ProviderManager {
    private providers: ethers.providers.JsonRpcProvider[] = [];
    private providerUrls: string[];
    private currentProviderIndex = 0;
    private reconnectInterval: number;

    constructor(providerUrls: string[], reconnectInterval: number = 5000) {
        this.providerUrls = providerUrls;
        this.reconnectInterval = reconnectInterval;
    }

    private async connectToProvider(url: string): Promise<ethers.providers.JsonRpcProvider> {
        try {
            const provider = new ethers.providers.JsonRpcProvider(url);
            await provider.getNetwork();
            return provider;
        } catch (error) {
            console.error(`Failed to connect to provider ${url}:`, error);
            throw error;
        }
    }

    public async getProvider(): Promise<ethers.providers.JsonRpcProvider> {
        if (this.providers.length === 0) {
            await this.initializeProviders();
        }

        if (this.providers.length === 0) {
            throw new Error('No available providers');
        }

        return this.providers[this.currentProviderIndex];
    }

    private async initializeProviders(): Promise<void> {
        for (const url of this.providerUrls) {
            try {
                const provider = await this.connectToProvider(url);
                this.providers.push(provider);
            } catch (error) {
                console.error(`Failed to initialize provider ${url}:`, error);
            }
        }

        if (this.providers.length > 0) {
            this.startReconnectionTimer();
        }
    }

    private startReconnectionTimer(): void {
        const reconnect = async () => {
            try {
                const newProvider = await this.connectToProvider(this.providerUrls[this.currentProviderIndex]);
                this.providers[this.currentProviderIndex] = newProvider;
                console.log(`Successfully reconnected to provider ${this.providerUrls[this.currentProviderIndex]}`);
            } catch (error) {
                console.error(`Failed to reconnect to provider ${this.providerUrls[this.currentProviderIndex]}:`, error);
                this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
            } finally {
                setTimeout(reconnect, this.reconnectInterval);
            }
        };

        setTimeout(reconnect, this.reconnectInterval);
    }
}

export default ProviderManager;