const { Address } = require('@ton/core');

try {
    const addr = Address.parse("0QBWF8Xr2z__phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNYej");
    console.log("Parsed Two Underscores Address:", addr.toString());
    console.log("Bounceable:", addr.toString({ bounceable: true, testOnly: true }));
    console.log("Hex:", addr.hash.toString('hex'));
} catch (e) {
    console.error("Error parsing:", e.message);
}
