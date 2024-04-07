import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

export interface Config {
  MIN_GAS_PRICE_MULTIPLIER: any;
  MAX_GAS_PRICE_MULTIPLIER: any;
  LOW_TX_COUNT: number;
  INFURA_PROJECT_ID: string;
  PRIVATE_KEY: string;
  CONTRACT_ADDRESS: string;
  CONTRACT_ABI: any;
  MAX_RETRIES: number;
  PROVIDER_URL: string;
  NEW_BLOCK_EVENT: string;
  PING_EVENT: string;
  BOT_STATE_KEY: string;
}

export interface BotState {
    lastProcessedBlock : number,
    lastProcessedEventIndex: number,
    pendingTxn: {
        nonce: number,
        status : 'pending' | 'mined' | 'failed',
        hash : string
    } | {}
}

const config: Config = {
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID || '',
    PRIVATE_KEY: process.env.PRIVATE_KEY || '',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
    CONTRACT_ABI: process.env.CONTRACT_ABI ? JSON.parse(process.env.CONTRACT_ABI) : [],
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
    LOW_TX_COUNT: parseInt(process.env.LOW_TX_COUNT || '50', 10),
    PROVIDER_URL: process.env.PROVIDER_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID',
    NEW_BLOCK_EVENT: 'block',
    PING_EVENT: 'Ping',
    BOT_STATE_KEY: 'bot-state',
    MIN_GAS_PRICE_MULTIPLIER: undefined,
    MAX_GAS_PRICE_MULTIPLIER: undefined
};

export default config;