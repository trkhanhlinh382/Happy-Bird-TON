const { Address } = require('@ton/core');
const { BirdJettonMinter } = require('../build/BirdJettonMinter/BirdJettonMinter_BirdJettonMinter');

async function main() {
    const owner1 = Address.parse("0QDeI1DP7sb5RmFuhFuWfhg1Kdv3cr87qJel3LFoB43rbm3e");
    const owner2 = Address.parse("EQDIR0sYE5GnuLoO6IQlb7qWw6SbRRwV_jEjggGLdo0ezpyA");
    const owner3 = Address.parse("0QBWF8Xr2z_phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNYej");

    const minter1 = await BirdJettonMinter.init(owner1);
    const minter2 = await BirdJettonMinter.init(owner2);
    const minter3 = await BirdJettonMinter.init(owner3);

    const { contractAddress } = require('@ton/core');
    
    console.log("Minter Address with owner1 (0QDeI...):", contractAddress(0, minter1).toString());
    console.log("Minter Address with owner2 (EQDIR...):", contractAddress(0, minter2).toString());
    console.log("Minter Address with owner3 (0QBWF...):", contractAddress(0, minter3).toString());
}

main();
