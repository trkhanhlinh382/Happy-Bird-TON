// check-metadata.js - Đọc trực tiếp URL metadata được lưu trong hợp đồng Minter trên mạng testnet
import { TonClient, Address } from '@ton/ton';

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
const minterAddr = Address.parse("EQAHUWRFOwDZPnTCb2LMwWvzQ1Fmd1t5XlpU8lrSMIPE7TQI");

async function main() {
    try {
        const result = await client.runMethod(minterAddr, 'get_jetton_data');
        const stack = result.stack;
        
        const totalSupply = stack.readBigNumber();
        const mintable = stack.readBoolean();
        const adminAddress = stack.readAddress();
        const contentCell = stack.readCell();
        
        console.log("Total Supply:", totalSupply.toString());
        console.log("Mintable:", mintable);
        console.log("Admin Address:", adminAddress.toString());
        
        // Giải mã Cell content
        const slice = contentCell.beginParse();
        const prefix = slice.loadUint(8);
        console.log("Metadata Prefix (must be 1):", prefix);
        
        const urlBuffer = slice.loadBuffer(slice.remainingBits / 8);
        const url = urlBuffer.toString('utf-8');
        console.log("Metadata URL in Contract:", url);
    } catch (err) {
        console.error("Error reading contract data:", err.message);
    }
}

main();
