import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { HappyBird } from '../build/HappyBird/HappyBird_HappyBird';
import '@ton/test-utils';

describe('HappyBird', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let happyBird: SandboxContract<HappyBird>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        happyBird = blockchain.openContract(await HappyBird.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await happyBird.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: happyBird.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and happyBird are ready to use
    });
});
