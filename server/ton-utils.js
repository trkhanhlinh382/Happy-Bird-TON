// ton-utils.js - Xử lý giao dịch Jetton trên TON từ Node.js backend
import { TonClient, WalletContractV4, Address, beginCell, toNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import dotenv from 'dotenv';

dotenv.config();

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

// Khởi tạo ví Admin của Server từ Mnemonic trong hợp đồng
const mnemonic = "twelve slender sleep same fabric curtain pipe bicycle detect kite erupt inspire round ride clutch regret wrong fog sun gold treat ramp castle galaxy";

async function getAdminWallet() {
  const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
  return WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
}

// Hàm tính toán động địa chỉ ví Jetton của bất kỳ người dùng nào qua Minter
export async function getJettonWalletAddress(minterAddressStr, userAddressStr) {
  try {
    const minterAddr = Address.parse(minterAddressStr);
    const userAddr = Address.parse(userAddressStr);
    
    const sliceCell = beginCell().storeAddress(userAddr).endCell();
    
    const result = await client.runMethod(minterAddr, 'get_wallet_address', [
      {
        type: 'slice',
        cell: sliceCell
      }
    ]);
    
    return result.stack.readAddress();
  } catch (err) {
    console.error('Failed to get Jetton wallet address:', err.message);
    throw err;
  }
}

// Hàm tự động ký gửi Jetton BIRD từ ví Admin sang ví người chơi
export async function sendJettonTransfer(userAddressStr, amount) {
  try {
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
    });
    
    const contract = client.open(wallet);
    const minterAddrStr = process.env.JETTON_MINTER_ADDRESS || "EQA7GXwu0vqlaAXdy0yJd8LJ-eBaAokXJa60FJ-B6OgrWEWz";
    
    console.log(`[TON] Đang tính toán địa chỉ ví Jetton của Admin...`);
    const adminJettonWallet = await getJettonWalletAddress(minterAddrStr, wallet.address.toString());
    console.log(`[TON] Ví Jetton của Admin: ${adminJettonWallet.toString()}`);
    
    console.log(`[TON] Đang tính toán địa chỉ ví Jetton nhận của người dùng...`);
    const recipientAddress = Address.parse(userAddressStr);
    
    const queryId = Math.floor(Date.now() / 1000);
    const jettonAmount = BigInt(amount) * 1000000000n; // 9 chữ số thập phân của BIRD
    
    // Xây dựng payload chuyển khoản Jetton tiêu chuẩn (TEP-74)
    const payload = beginCell()
      .storeUint(0x0f8a7ea5, 32)      // Opcode chuyển Jetton
      .storeUint(queryId, 64)         // query_id
      .storeCoins(jettonAmount)       // số lượng coins thực tế
      .storeAddress(recipientAddress)  // destination
      .storeAddress(wallet.address)    // response_address (nhận gas dư)
      .storeBit(false)                // custom_payload (không dùng)
      .storeCoins(toNano('0.01'))      // forward_ton_amount gửi kèm thông báo
      .storeBit(false)                // forward_payload (không dùng)
      .endCell();

    const seqno = await contract.getSeqno();
    console.log(`[TON] Gửi giao dịch chuyển ${amount} BIRD... Seqno: ${seqno}`);
    
    await contract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [
        {
          to: adminJettonWallet,
          value: toNano('0.05'), // Phí gas giao dịch gửi đi
          bounce: true,
          body: payload,
        }
      ]
    });
    
    console.log(`[TON] Giao dịch chuyển tiền đã được phát sóng lên mạng lưới!`);
    return { success: true, queryId };
  } catch (err) {
    console.error('[TON] Lỗi gửi Jetton transfer:', err.message);
    throw err;
  }
}
