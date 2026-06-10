import { Address, TonClient } from '@ton/ton';
import { BirdJettonWallet } from '../build/BirdJettonMinter/BirdJettonMinter_BirdJettonWallet';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    const minterAddrStr = process.env.JETTON_MINTER_ADDRESS || "EQCyA91sLkt-_YcrEnlPoc6bw7VfmSNaKMwTmr8GhrJxyv6Z";
    const rewardAddrStr = process.env.BIRD_REWARD_ADDRESS || "EQAXdmvlN2GgD0xumr_pY9T4q3W1vZPi_cdY7GbPoiBjBMB9";
    const adminAddrStr = process.env.ADMIN_ADDRESS || "EQDeI1DP7sb5RmFuhFuWfhg1Kdv3cr87qJel3LFoB43rbouR";

    const jettonMinterAddress = Address.parse(minterAddrStr);
    const rewardAddress = Address.parse(rewardAddrStr);
    const adminAddress = Address.parse(adminAddrStr);

    console.log("--------------------------------------------------");
    console.log("Minter Address:", minterAddrStr);
    console.log("Reward Contract Address:", rewardAddrStr);
    console.log("Admin Address:", adminAddrStr);
    console.log("--------------------------------------------------");

    // Reconstruct Jetton wallets under new 2-parameter constructor (owner, jettonMaster)
    const adminJettonWallet = await BirdJettonWallet.fromInit(adminAddress, jettonMinterAddress);
    const rewardJettonWallet = await BirdJettonWallet.fromInit(rewardAddress, jettonMinterAddress);

    // We check the user target wallet (0QBjJJoiCTT4ZT6AKcXyD6PfFQxxyQMUGSbvG_D-tai67jGl)
    const userTargetAddress = Address.parse("0QBjJJoiCTT4ZT6AKcXyD6PfFQxxyQMUGSbvG_D-tai67jGl");
    const userJettonWallet = await BirdJettonWallet.fromInit(userTargetAddress, jettonMinterAddress);

    console.log("1. Admin's Jetton Wallet Address:", adminJettonWallet.address.toString());
    console.log("2. Reward Contract's Jetton Wallet Address:", rewardJettonWallet.address.toString());
    console.log("3. User's Jetton Wallet Address:", userJettonWallet.address.toString());
    console.log("--------------------------------------------------");

    const checkBalance = async (address: Address, label: string) => {
        try {
            await sleep(1500); // Respect rate limit
            const state = await client.getContractState(address);
            if (state.state !== 'active') {
                console.log(`   [${label}] Address: ${address.toString()} -> NOT ACTIVE (0 MEW)`);
                return;
            }
            const result = await client.runMethod(address, 'get_wallet_data');
            const balance = result.stack.readBigNumber();
            console.log(`   [${label}] Address: ${address.toString()} -> ACTIVE: ${(Number(balance) / 1e9).toFixed(4)} MEW`);
        } catch (err: any) {
            console.log(`   [${label}] Address: ${address.toString()} -> ERROR: ${err.message}`);
        }
    };

    console.log("Checking balances on-chain...");
    await checkBalance(adminJettonWallet.address, "Admin Wallet");
    await checkBalance(rewardJettonWallet.address, "Reward Wallet");
    await checkBalance(userJettonWallet.address, "User Wallet");
}

run();
