<p align="center">
  <img src="https://cdn-icons-png.flaticon.com/512/6295/6295417.png" width="100" />
</p>
<p align="center">
    <h1 align="center">PING PONG BOT</h1>
</p>
<p align="center">
    <em><code>► A pong bot that never misses a ping</code></em>
</p>
<p align="center">
	<img src="https://img.shields.io/github/last-commit/madhurMongia/pingPongBot?style=flat&logo=git&logoColor=white&color=0080ff" alt="last-commit">
	<img src="https://img.shields.io/github/languages/top/madhurMongia/pingPongBot?style=flat&color=0080ff" alt="repo-top-language">
	<img src="https://img.shields.io/github/languages/count/madhurMongia/pingPongBot?style=flat&color=0080ff" alt="repo-language-count">
<p>
<p align="center">
		<em>Developed with the software and tools below.</em>
</p>
<p align="center">
	<img src="https://img.shields.io/badge/Nodemon-76D04B.svg?style=flat&logo=Nodemon&logoColor=white" alt="Nodemon">
	<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=TypeScript&logoColor=white" alt="TypeScript">
	<img src="https://img.shields.io/badge/JSON-000000.svg?style=flat&logo=JSON&logoColor=white" alt="JSON">
</p>
<hr>

## 🔗 Quick Links

> - [📍 Overview](#-overview)

> - [📂 Repository Structure](#-repository-structure)
> - [🧩 Modules](#-modules)
> - [🚀 Getting Started](#-getting-started)
>   - [⚙️ Installation](#️-installation)
>   - [🤖 Running pingPongBot](#-running-pingPongBot)
> - [📦 Features](#robust-and-reliable-bot-architecture)



## 📍 Overview

This is a ping pong bot that calls the `pong` function of the `pingPong` smart contract deployed at `0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d` for every event emitted. Various techniques have been used to ensure the bot's robustness and reliability.

## 📂 Repository Structure

```sh
└── pingPongBot/
    ├── DockerFile
    ├── ideas
    ├── output.log
    ├── package-lock.json
    ├── package.json
    ├── src
    │   ├── PersistenceModule.ts
    │   ├── ProviderManger.ts
    │   ├── config.ts
    │   ├── contract
    │   │   ├── PingPongABI.json
    │   │   └── contractManager.ts
    │   └── main.ts
    └── tsconfig.json
```

## 🧩 Modules
The Bot breakdown logic into seprate modules to ensure more modularity and reusability.


| File                                                                                                     | Summary                         |
| ---                                                                                                      | ---                             |
| [config.ts](https://github.com/madhurMongia/pingPongBot/blob/master/src/config.ts)                       | ► The `config.ts` module is responsible for centralizing and exporting the bot's configuration settings. This allows other modules to easily access the necessary configuration values without duplication or hard-coding. The configuration includes settings such as the contract address, API endpoints, and other parameters required for the bot's operation. |
| [PersistenceModule.ts](https://github.com/madhurMongia/pingPongBot/blob/master/src/PersistenceModule.ts) | ► The `PersistenceModule` manages the persistent storage and retrieval of the bot's state. It saves the state to a JSON file, loads state from the file, and provides access to the state, ensuring the bot's context is maintained between executions. The use of a Proxy simplifies state management by automatically saving updates. |
| [ProviderManger.ts](https://github.com/madhurMongia/pingPongBot/blob/master/src/ProviderManger.ts)       | ► The `ProviderManager` module manages a set of Ethereum JSON-RPC providers, ensuring reliable and fault-tolerant access to the Ethereum network. It initializes provider connections, handles failures, and automatically reconnects to available providers, maintaining the bot's resilience in the face of network issues or provider failures. |
| [contractManager.ts](https://github.com/madhurMongia/pingPongBot/blob/master/src/contract/contractManager.ts)                           |► The `ContractInteractionModule` is responsible for interacting with the pingPong smart contract. It provides methods to call the pong function of the contract, handling transaction retries and gas price optimization. The module also includes a method to fetch the relevant ping events from the contract.|
| [main.ts](https://github.com/madhurMongia/pingPongBot/blob/master/src/main.ts)                           | ► The `main.ts` module is the entry point of the bot application. It initializes the necessary components, such as the ProviderManager, PersistenceModule, and ContractInteractionModule, to manage the bot's operations. The module loads the bot's state from the persistence module, handles any pending transactions, and sets up event listeners to monitor new blocks. When new blocks are detected, the module processes the associated events and calls the pong function of the smart contract accordingly. The module also includes error handling and automatic restart functionality to ensure the bot's resilience in the face of issues.|

### ⚙️ Installation

1. Clone the pingPongBot repository:

```sh
git clone https://github.com/madhurMongia/pingPongBot
```

2. Change to the project directory:

```sh
cd pingPongBot
```

3. Install the dependencies:

```sh
npm install
```

### 🤖 Running pingPongBot

Use the following command to run pingPongBot:

```sh
npm run dev
```

## Robust and Reliable Bot Architecture

The pingPong bot is designed to be highly resilient and reliable in the face of common issues that can arise when interacting with decentralized blockchain networks. The bot's architecture incorporates several key features to address these challenges:

### Maintaining State Across Crashes

The `PersistenceModule` is responsible for managing the persistent storage and retrieval of the bot's state. It saves the current state to a JSON file, loads the state from the file, and provides access to the state, ensuring the bot's context is maintained between executions.

This module is crucial for enabling the bot to continue its operations seamlessly, even in the event of a system crash or restart. By persisting the bot's state, the `PersistenceModule` allows the bot to resume processing where it left off, without losing its place or having to start over from the beginning.


### Network Outages and Provider Failures

The `ProviderManager` module manages a set of Ethereum JSON-RPC providers, automatically handling connection failures and reconnecting to available providers. If a provider becomes unavailable, the bot will seamlessly switch to the next provider in the list, ensuring uninterrupted access to the Ethereum network.

### Provider Rate Limiting

To prevent issues caused by provider rate limiting, the `ProviderManager` module implements a periodic reconnection timer that periodically checks the status of the provider connections and restores any that have become unavailable. This helps the bot maintain reliable access to the Ethereum network, even in the face of provider-imposed rate limits.

### Maintaining Speed and Funds with Dynamic Gas Price Calculation

To ensure the pingPong bot can operate efficiently while also minimizing gas costs, the `ContractInteractionModule` employs a dynamic gas price calculation mechanism. This mechanism adjusts the gas price based on the bot's current Ethereum balance and the estimated cost of the transaction.

The gas price calculation is performed as follows:

1. The module first calculates the current transaction cost by multiplying the current gas price with the estimated gas limit for the `pong` function call.
2. It then determines the maximum number of transactions the bot can execute based on its current Ethereum balance and the transaction cost.
3. Depending on the maximum number of transactions, the module applies a gas price multiplier:
  - If the maximum number of transactions is low (below a configured threshold), the module uses a minimum gas price multiplier to ensure the transaction is processed quickly.
  - If the maximum number of transactions is high (above a configured threshold), the module uses a maximum gas price multiplier to minimize gas costs.
  - For intermediate values, the module interpolates between the minimum and maximum multipliers based on the current balance.
4. The final gas price is calculated by multiplying the current gas price by the selected multiplier.

This dynamic gas price calculation helps the bot maintain a balance between transaction speed and gas cost optimization. When the bot's Ethereum balance is low, the gas price is increased to prioritize transaction processing and ensure the bot can continue its operations. Conversely, when the balance is high, the gas price is reduced to minimize unnecessary gas costs and preserve the bot's funds.

By incorporating this gas price optimization strategy, the pingPong bot can operate efficiently and reliably, even in periods of high network congestion when gas prices are elevated.

### Automatic Retries

The `ContractInteractionModule` is responsible for interacting with the `pingPong` smart contract. When calling the `pong` function, the module implements a retry mechanism with exponential backoff. If the initial transaction fails, the module will automatically retry the transaction, gradually increasing the gas price to ensure the transaction is processed.