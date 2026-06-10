const { Address } = require('@ton/core');

const addr1 = Address.parse("0QDeI1DP7sb5RmFuhFuWfhg1Kdv3cr87qJel3LFoB43rbm3e");
const addr2 = Address.parse("EQDIR0sYE5GnuLoO6IQlb7qWw6SbRRwV_jEjggGLdo0ezpyA");
const addr3 = Address.parse("0QBWF8Xr2z_phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNYej");
const addr4 = Address.parse("EQCXDZxPPN3W9RU8WpQu_cKAnP7lBaQD8n0me5zj-4eNotiA");

console.log("addr1 (deployer 0QDeI...):", addr1.toString(), "Hex:", addr1.hash.toString('hex'));
console.log("addr2 (owner on-chain):   ", addr2.toString(), "Non-bounceable Testnet:", addr2.toString({ bounceable: false, testOnly: true }), "Hex:", addr2.hash.toString('hex'));
console.log("addr3 (admin 0QBWF8...):   ", addr3.toString(), "Hex:", addr3.hash.toString('hex'));
console.log("addr4 (reward EQCXD...):   ", addr4.toString(), "Hex:", addr4.hash.toString('hex'));

