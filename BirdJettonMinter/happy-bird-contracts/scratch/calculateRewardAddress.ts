import { Address } from '@ton/core';
import { BirdReward } from '../build/BirdReward/BirdReward_BirdReward';

async function main() {
    const adminAddress = Address.parse("0QBWF8Xr2z_phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNYej");
    const jettonMinterAddress = Address.parse("EQByxvxM1UIpBvViitJojjDTwyjzFfFOZiEVBCb9fzZVSI5f");

    const reward = await BirdReward.init(adminAddress, jettonMinterAddress);

    const { contractAddress } = require('@ton/core');
    console.log("Calculated BirdReward Address:", contractAddress(0, reward).toString());
}

main();
