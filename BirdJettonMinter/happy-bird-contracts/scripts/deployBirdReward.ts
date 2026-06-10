import { Address, toNano } from '@ton/core';
import { BirdReward } from '../build/BirdReward/BirdReward_BirdReward';
import { NetworkProvider } from '@ton/blueprint';
import 'dotenv/config';

export async function run(provider: NetworkProvider) {
    const minterAddrStr = process.env.JETTON_MINTER_ADDRESS;
    const adminAddrStr = process.env.ADMIN_ADDRESS;

    if (!minterAddrStr || !adminAddrStr) {
        throw new Error("LỖI: Vui lòng cấu hình JETTON_MINTER_ADDRESS và ADMIN_ADDRESS trong tệp .env");
    }

    const adminAddress = Address.parse(adminAddrStr);
    const jettonMinterAddress = Address.parse(minterAddrStr);

    const birdReward = provider.open(await BirdReward.fromInit(adminAddress, jettonMinterAddress));

    console.log("Đang deploy BirdReward...");
    await birdReward.send(
        provider.sender(),
        {
            value: toNano('0.05'), // Phí gas triển khai hợp đồng
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(birdReward.address);
    console.log("BirdReward triển khai thành công tại địa chỉ:", birdReward.address.toString());
}

