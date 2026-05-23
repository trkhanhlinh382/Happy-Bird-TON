// ton-utils.js - Gửi giao dịch tới smart contract TON từ Node.js backend
// Lưu ý: Cần cài đặt các package: @ton/ton @ton/crypto dotenv

const { TonClient, WalletContractV4 } = require('@ton/ton');
require('dotenv').config();

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

const wallet = WalletContractV4.create({
  workchain: 0,
  publicKey: Buffer.from(process.env.TON_WALLET_PUBLIC, 'hex'),
});

// Hàm gửi giao dịch updateScore (payload cần encode đúng theo contract)
async function sendUpdateScore(userAddress, score) {
  // TODO: Encode payload đúng format contract Tact (tham khảo ton-core hoặc tonweb)
  const payload = Buffer.from(''); // Thay bằng payload thực tế

  await wallet.sendTransfer({
    secretKey: Buffer.from(process.env.TON_WALLET_SECRET, 'hex'),
    to: process.env.BIRD_REWARD_CONTRACT,
    value: '0.05', // TON fee
    body: payload,
  });
}

module.exports = { sendUpdateScore };
