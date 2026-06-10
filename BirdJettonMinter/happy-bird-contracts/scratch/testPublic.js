const { WalletContractV4 } = require('@ton/ton');

const pubKey = Buffer.from("acc562a67ffe31929d27332bd740f6c61ce48f662293279ec794f1439477eea8", "hex");
const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: pubKey
});

console.log("Server Wallet Address:", wallet.address.toString());
console.log("Server Wallet Non-bounceable:", wallet.address.toString({ bounceable: false, testOnly: true }));
