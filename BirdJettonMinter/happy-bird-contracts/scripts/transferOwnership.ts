import { Address, toNano } from '@ton/core';
import { BirdJettonMinter } from '../build/BirdJettonMinter/BirdJettonMinter_BirdJettonMinter';
import { NetworkProvider } from '@ton/blueprint';
import 'dotenv/config';

export async function run(provider: NetworkProvider) {
    const minterAddrStr = process.env.JETTON_MINTER_ADDRESS;
    const rewardAddrStr = process.env.BIRD_REWARD_ADDRESS;

    if (!minterAddrStr || !rewardAddrStr) {
        throw new Error("LỖI: Vui lòng cấu hình JETTON_MINTER_ADDRESS và BIRD_REWARD_ADDRESS trong tệp .env");
    }

    const jettonMinterAddress = Address.parse(minterAddrStr);
    const birdRewardAddress = Address.parse(rewardAddrStr);

    const birdJettonMinter = provider.open(BirdJettonMinter.fromAddress(jettonMinterAddress));

    console.log("Đang chuyển quyền sở hữu của Minter sang cho hợp đồng Reward...");
    await birdJettonMinter.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'ChangeOwner', // Message chuẩn hóa đổi chủ sở hữu của Tact
            queryId: 0n,
            newOwner: birdRewardAddress,
        }
    );

    console.log("Yêu cầu chuyển quyền sở hữu đã được gửi thành công.");
}

