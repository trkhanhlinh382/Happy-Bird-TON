import { toNano } from '@ton/core';
import { HappyBird } from '../build/HappyBird/HappyBird_HappyBird';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const happyBird = provider.open(await HappyBird.fromInit());

    await happyBird.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(happyBird.address);

    // run methods on `happyBird`
}
