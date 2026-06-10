import { Address } from '@ton/core';
import { BirdJettonMinter } from '../build/BirdJettonMinter/BirdJettonMinter_BirdJettonMinter';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const minterAddrStr = process.env.JETTON_MINTER_ADDRESS || "EQByxvxM1UIpBvViitJojjDTwyjzFfFOZiEVBCb9fzZVSI5f";
    const jettonMinterAddress = Address.parse(minterAddrStr);
    
    const birdJettonMinter = provider.open(BirdJettonMinter.fromAddress(jettonMinterAddress));
    
    try {
        console.log("Đang truy vấn chủ sở hữu của hợp đồng Minter tại địa chỉ:", minterAddrStr);
        const owner = await birdJettonMinter.getOwner();
        console.log(">>> CHỦ SỞ HỮU TRÊN CHUỖI (Owner on-chain):", owner.toString());
    } catch (e: any) {
        console.error("Lỗi khi gọi getter:", e.message);
    }
}
