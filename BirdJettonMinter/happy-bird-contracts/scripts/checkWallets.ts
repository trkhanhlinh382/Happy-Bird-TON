import { Address } from '@ton/core';
import { BirdJettonMinter } from '../build/BirdJettonMinter/BirdJettonMinter_BirdJettonMinter';
import { BirdJettonWallet } from '../build/BirdJettonMinter/BirdJettonMinter_BirdJettonWallet';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
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

    const checkBalance = async (walletInstance: BirdJettonWallet, label: string) => {
        try {
            const opened = provider.open(walletInstance);
            const data = await opened.getGetWalletData();
            console.log(`   [${label}] Address: ${walletInstance.address.toString()} -> ACTIVE: ${(Number(data.balance) / 1e9).toFixed(4)} MEW`);
        } catch (err: any) {
            console.log(`   [${label}] Address: ${walletInstance.address.toString()} -> NOT ACTIVE (0 MEW)`);
        }
    };

    console.log("Checking balances on-chain...");
    await checkBalance(adminJettonWallet, "Admin Wallet");
    await checkBalance(rewardJettonWallet, "Reward Wallet");
    await checkBalance(userJettonWallet, "User Wallet");
}
