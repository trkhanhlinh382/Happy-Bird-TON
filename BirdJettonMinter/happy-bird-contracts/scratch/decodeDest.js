const { Address } = require('@ton/core');

const hash = Buffer.from("3b197c2ed2faa56805ddcb4c8977c2c9f9e05a02891725aeb4149f81e8e82b58", "hex");
const destAddr = new Address(0, hash);

console.log("Destination Address:", destAddr.toString());
console.log("Destination Non-bounceable:", destAddr.toString({ bounceable: false, testOnly: true }));
