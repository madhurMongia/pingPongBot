import dotenv from 'dotenv';

dotenv.config();

export interface Config {
    HIGH_TX_COUNT: number;
    MIN_GAS_PRICE_MULTIPLIER: number;
    MAX_GAS_PRICE_MULTIPLIER: number;
    LOW_TX_COUNT: number;
    PRIVATE_KEY: string;
    CONTRACT_ADDRESS: string;
    MAX_RETRIES: number;
    NEW_BLOCK_EVENT: string;
    PING_EVENT: string;
    BOT_STATE_KEY: string;
    ALCHEMY_PRIVATE_KEY: string;
    CHAINSTACK_PRIVATE_KEY: string;
    ALCHEMY_NODE_ENDPOINT: string;
    CHAINSTACK_NODE_ENDPOINT: string;
    PUBLIC_NODE_ENDPOINT:string;
    MAX_BOT_RESTART_ATTEMPTS: number;
}
export enum TransactionStatus {
    Pending = 'pending',
    Mined = 'mined',
    Failed = 'failed'
}

export interface BotState {
    lastProcessedBlock: number,
    lastProcessedEventIndex: number,
    pendingTxn?: {
        nonce: number,
        status: TransactionStatus
        hash: string,
        txnHash: string,
    };
}

const config: Config = {
    PRIVATE_KEY: process.env.PRIVATE_KEY || '',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
    LOW_TX_COUNT: parseInt(process.env.LOW_TX_COUNT || '10000', 10),
    HIGH_TX_COUNT: parseInt(process.env.HIGH_TX_COUNT || '500000', 10),
    NEW_BLOCK_EVENT: 'block',
    PING_EVENT: 'Ping',
    BOT_STATE_KEY: 'bot-state',
    MIN_GAS_PRICE_MULTIPLIER: parseFloat(process.env.MIN_GAS_PRICE_MULTIPLIER || '0.8'),
    MAX_GAS_PRICE_MULTIPLIER: parseFloat(process.env.MAX_GAS_PRICE_MULTIPLIER || '1.2'),
    ALCHEMY_PRIVATE_KEY: process.env.ALCHEMY_PRIVATE_KEY || '',
    CHAINSTACK_PRIVATE_KEY: process.env.CHAINSTACK_PRIVATE_KEY || '',
    ALCHEMY_NODE_ENDPOINT: process.env.ALCHEMY_NODE_ENDPOINT || '',
    CHAINSTACK_NODE_ENDPOINT : process.env.CHAINSTACK_NODE_ENDPOINT || '',
    PUBLIC_NODE_ENDPOINT: process.env.PUBLIC_NODE_ENDPOINT || 'https://ethereum-sepolia.rpc.subquery.network/public',
    MAX_BOT_RESTART_ATTEMPTS : parseInt(process.env.PUBLIC_NODE_ENDPOINT ||'10') 
};

export default config;