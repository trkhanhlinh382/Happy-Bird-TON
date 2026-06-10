const { mnemonicToPrivateKey } = require('@ton/crypto');
const { WalletContractV4 } = require('@ton/ton');

async function main() {
    const mnemonic = "twelve slender sleep same fabric curtain pipe bicycle detect kite erupt inspire round ride clutch regret wrong fog sun gold treat ramp castle galaxy";
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });
    console.log("Wallet address from mnemonic:", wallet.address.toString());
    console.log("Wallet non-bounceable testnet:", wallet.address.toString({ bounceable: false, testOnly: true }));
}

main();
