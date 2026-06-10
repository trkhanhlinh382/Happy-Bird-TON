import { Address, toNano, beginCell, Dictionary, Cell } from '@ton/core';
import { sha256_sync } from '@ton/crypto';
import { BirdJettonMinter } from '../build/BirdJettonMinter/BirdJettonMinter_BirdJettonMinter';
import { NetworkProvider } from '@ton/blueprint';

// Hàm xây dựng On-Chain Metadata Cell theo chuẩn TEP-64
function buildJettonOnchainMetadata(data: { [key: string]: string }): Cell {
    const KEY_FREE_SIZE = 256;
    const ONCHAIN_CONTENT_PREFIX = 0x00; // 0x00 đại diện cho metadata được lưu trực tiếp On-Chain
    
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(KEY_FREE_SIZE), Dictionary.Values.Cell());
    
    for (const [key, value] of Object.entries(data)) {
        const keyHash = BigInt('0x' + sha256_sync(key).toString('hex'));
        const valueCell = beginCell()
            .storeUint(0x00, 8) // 0x00 đại diện cho string content bên trong value cell
            .storeBuffer(Buffer.from(value, 'utf-8'))
            .endCell();
        dict.set(keyHash, valueCell);
    }
    
    return beginCell()
        .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
        .storeDict(dict)
        .endCell();
}

export async function run(provider: NetworkProvider) {
    const ownerAddress = provider.sender().address!;
    
    // Cấu hình Metadata lưu trực tiếp On-Chain để các ví và indexer đọc được ngay lập tức
    const metadata = {
        name: "MEW Token",
        symbol: "MEW",
        decimals: "9",
        description: "The official reward token for Happy Bird game on TON",
        image: "https://raw.githubusercontent.com/trkhanhlinh382/Happy-Bird-TON/main/client/public/mew_token_logo.png"
    };
    
    const contentCell = buildJettonOnchainMetadata(metadata);

    const birdJettonMinter = provider.open(await BirdJettonMinter.fromInit(ownerAddress, contentCell));

    console.log("Đang deploy BirdJettonMinter chuẩn TEP-74 với On-Chain Metadata...");
    await birdJettonMinter.send(
        provider.sender(),
        {
            value: toNano('0.05'), // Phí gas triển khai hợp đồng
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(birdJettonMinter.address);
    console.log("BirdJettonMinter triển khai thành công tại địa chỉ:", birdJettonMinter.address.toString());
}
