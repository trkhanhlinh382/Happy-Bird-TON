import { Address, toNano } from '@ton/core';
import { BirdJettonMinter } from '../build/BirdJettonMinter/BirdJettonMinter_BirdJettonMinter';
import { NetworkProvider } from '@ton/blueprint';
import 'dotenv/config';

export async function run(provider: NetworkProvider) {
    const minterAddrStr = process.env.JETTON_MINTER_ADDRESS;
    const adminAddrStr = process.env.ADMIN_ADDRESS;

    if (!minterAddrStr || !adminAddrStr) {
        throw new Error("LỖI: Vui lòng cấu hình JETTON_MINTER_ADDRESS và ADMIN_ADDRESS trong tệp .env");
    }

    const jettonMinterAddress = Address.parse(minterAddrStr);
    const adminWallet = Address.parse(adminAddrStr);

    const birdJettonMinter = provider.open(BirdJettonMinter.fromAddress(jettonMinterAddress));

    console.log("Đang đúc 10,000,000 BIRD vào ví gốc Admin...");
    await birdJettonMinter.send(
        provider.sender(),
        {
            value: toNano('0.15'),
        },
        {
            $$type: 'Mint',
            amount: 10000000n * 1000000000n, // 10 triệu BIRD (nhân 9 chữ số thập phân)
            receiver: adminWallet,
        }
    );

    console.log("Yêu cầu đúc BIRD đã được gửi thành công!");
}

