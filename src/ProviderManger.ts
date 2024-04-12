import { ethers } from 'ethers';

class ProviderManager {
  private providers: ethers.providers.JsonRpcProvider[] = [];
  private providerUrls: string[];
  private currentProviderIndex = 0;
  private reconnectInterval: number;

  /**
   * Creates an instance of ProviderManager.
   * @param {string[]} providerUrls - An array of provider URLs.
   * @param {number} [reconnectInterval=50000] - The interval (in milliseconds) at which to attempt reconnection to providers.
   */
  constructor(providerUrls: string[], reconnectInterval: number = 50000) {
    this.providerUrls = providerUrls;
    this.reconnectInterval = reconnectInterval;
  }

  /**
   * Connects to a provider using the given URL.
   * @param {string} url - The URL of the provider to connect to.
   * @returns {Promise<ethers.providers.JsonRpcProvider>} A Promise that resolves to the connected provider.
   * @throws {Error} An error if the connection fails.
   * @private
   */
  private async connectToProvider(url: string): Promise<ethers.providers.JsonRpcProvider> {
    try {
      console.log(`Connecting to provider ${url}`);
      const provider = new ethers.providers.JsonRpcProvider(url);
      await provider.getNetwork();
      console.log(`Successfully connected to provider ${url}`);
      return provider;
    } catch (error: any) {
      console.error(`Failed to connect to provider ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieves a provider from the available providers.
   * @returns {Promise<ethers.providers.JsonRpcProvider>} A Promise that resolves to the retrieved provider.
   * @throws {Error} An error if there are no available providers.
   */
  public async getProvider(): Promise<ethers.providers.JsonRpcProvider> {
    if (this.providers.length === 0) {
      await this.initializeProviders();
    }

    if (this.providers.length === 0) {
      throw new Error('No available providers');
    }

    return this.providers[this.currentProviderIndex];
  }

  /**
   * Initializes the providers by connecting to each provider URL.
   * @returns {Promise<void>} A Promise that resolves when the providers are initialized.
   * @private
   */
  private async initializeProviders(): Promise<void> {
    for (const url of this.providerUrls) {
      try {
        const provider = await this.connectToProvider(url);
        this.providers.push(provider);
      } catch (error: any) {
        console.error(`Failed to initialize provider ${url}:`, error.message);
      }
    }
    if (this.providers.length > 0) {
      this.startReconnectionTimer();
    }
  }

  /**
   * Starts the reconnection timer to periodically attempt reconnection to providers.
   * @private
   */
  private startReconnectionTimer(): void {
    const reconnect = async () => {
      try {
        const newProvider = await this.connectToProvider(this.providerUrls[this.currentProviderIndex]);
        this.providers[this.currentProviderIndex] = newProvider;
        console.log(`Successfully reconnected to provider ${this.providerUrls[this.currentProviderIndex]}`);
      } catch (error: any) {
        // console.error(`Failed to reconnect to provider ${this.providerUrls[this.currentProviderIndex]}:`, error.message);
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
      } finally {
        setTimeout(reconnect, this.reconnectInterval);
      }
    };

    console.log(`Starting reconnection timer with interval ${this.reconnectInterval} ms`);
    setTimeout(reconnect, this.reconnectInterval);
  }
}

export default ProviderManager;

