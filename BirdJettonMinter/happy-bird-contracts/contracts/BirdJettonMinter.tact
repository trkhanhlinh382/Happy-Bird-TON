// BirdJettonMinter.tact - Hợp đồng Jetton Minter và Jetton Wallet chuẩn TEP-74
import "@stdlib/deploy";
import "@stdlib/ownable";

// -------------------------------------------------------------
// JETTON MESSAGES
// -------------------------------------------------------------

message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseAddress: Address;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x178d4519) TokenTransferInternal {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    responseAddress: Address;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forwardPayload: Slice as remaining;
}

message(0xd53276db) TokenExcesses {
    queryId: Int as uint64;
}

message(0x595f07bc) TokenBurn {
    queryId: Int as uint64;
    amount: Int as coins;
    responseAddress: Address;
    customPayload: Cell?;
}

message(0x7fdd97e2) TokenBurnNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    responseAddress: Address;
}

// Custom Messages
message Mint {
    amount: Int;
    receiver: Address;
}

// -------------------------------------------------------------
// JETTON MASTER (MINTER)
// -------------------------------------------------------------
contract BirdJettonMinter with Deployable, OwnableTransferable {
    owner: Address;
    totalSupply: Int;
    content: Cell; // Lưu trữ TEP-64 metadata cell

    init(owner: Address, content: Cell) {
        self.owner = owner;
        self.totalSupply = 0;
        self.content = content;
    }

    receive(msg: Mint) {
        self.requireOwner();
        self.totalSupply = self.totalSupply + msg.amount;
        
        let winit: StateInit = self.getJettonWalletInit(msg.receiver);
        send(SendParameters{
            to: contractAddress(winit),
            value: 0, // Sử dụng 0 để SendRemainingValue tự động chuyển tiếp toàn bộ TON còn lại của giao dịch đến
            bounce: true,
            mode: SendRemainingValue,
            body: TokenTransferInternal{
                queryId: 0,
                amount: msg.amount,
                from: self.owner,
                responseAddress: self.owner,
                forwardTonAmount: 0,
                forwardPayload: emptySlice()
            }.toCell(),
            code: winit.code,
            data: winit.data
        });
    }

    receive(msg: TokenBurnNotification) {
        let winit: StateInit = self.getJettonWalletInit(msg.sender);
        require(contractAddress(winit) == sender(), "Invalid sender wallet");
        self.totalSupply = self.totalSupply - msg.amount;
        
        // Trả lại lượng gas còn dư cho địa chỉ phản hồi
        send(SendParameters{
            to: msg.responseAddress,
            value: 0,
            bounce: false,
            mode: SendRemainingValue,
            body: TokenExcesses{queryId: msg.queryId}.toCell()
        });
    }

    // Tính toán StateInit của ví con Jetton cho một tài khoản
    fun getJettonWalletInit(address: Address): StateInit {
        return initOf BirdJettonWallet(address, myAddress());
    }

    // TEP-74 Getters
    get fun get_jetton_data(): JettonDataSpec {
        return JettonDataSpec{
            totalSupply: self.totalSupply,
            mintable: true,
            adminAddress: self.owner,
            jettonContent: self.content,
            jettonWalletCode: (self.getJettonWalletInit(myAddress())).code
        };
    }

    get fun get_wallet_address(owner: Address): Address {
        let winit: StateInit = self.getJettonWalletInit(owner);
        return contractAddress(winit);
    }
}

// -------------------------------------------------------------
// JETTON WALLET (VÍ PHỤ LƯU TRỮ SỐ DƯ)
// -------------------------------------------------------------
contract BirdJettonWallet {
    owner: Address;        // Địa chỉ ví người dùng sở hữu token
    jettonMaster: Address; // Địa chỉ Jetton Minter chính
    balance: Int;          // Số dư token của ví con này

    init(owner: Address, jettonMaster: Address) {
        self.owner = owner;
        self.jettonMaster = jettonMaster;
        self.balance = 0;
    }

    receive(msg: TokenTransfer) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Invalid sender");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance = self.balance - msg.amount;
        
        let winit: StateInit = self.getJettonWalletInit(msg.destination);
        let walletAddress: Address = contractAddress(winit);
        
        send(SendParameters{
            to: walletAddress,
            value: 0,
            bounce: true,
            mode: SendRemainingValue,
            body: TokenTransferInternal{
                queryId: msg.queryId,
                amount: msg.amount,
                from: self.owner,
                responseAddress: msg.responseAddress,
                forwardTonAmount: msg.forwardTonAmount,
                forwardPayload: msg.forwardPayload
            }.toCell(),
            code: winit.code,
            data: winit.data
        });
    }

    receive(msg: TokenTransferInternal) {
        let ctx: Context = context();
        if (ctx.sender != self.jettonMaster) {
            let winit: StateInit = self.getJettonWalletInit(msg.from);
            require(contractAddress(winit) == ctx.sender, "Invalid sender wallet");
        }
        
        self.balance = self.balance + msg.amount;
        require(self.balance >= 0, "Invalid balance");
        
        // Gửi thông báo chuyển tiền nếu forward_ton_amount > 0
        if (msg.forwardTonAmount > 0) {
            send(SendParameters{
                to: self.owner,
                value: msg.forwardTonAmount,
                bounce: false,
                mode: 0,
                body: TokenNotification{
                    queryId: msg.queryId,
                    amount: msg.amount,
                    from: msg.from,
                    forwardPayload: msg.forwardPayload
                }.toCell()
            });
        }
        
        // Trả phí thừa (gas refund) về cho responseAddress
        let msgValue: Int = ctx.value;
        let fwdFee: Int = ctx.readForwardFee();
        let serviceFee: Int = ton("0.01"); // Phí cơ bản
        let refundValue: Int = msgValue - msg.forwardTonAmount - fwdFee - serviceFee;
        if (refundValue > 0) {
            send(SendParameters{
                to: msg.responseAddress,
                value: refundValue,
                bounce: false,
                mode: 0,
                body: TokenExcesses{queryId: msg.queryId}.toCell()
            });
        }
    }

    receive(msg: TokenBurn) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Invalid sender");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance = self.balance - msg.amount;
        
        send(SendParameters{
            to: self.jettonMaster,
            value: 0,
            bounce: true,
            mode: SendRemainingValue,
            body: TokenBurnNotification{
                queryId: msg.queryId,
                amount: msg.amount,
                sender: self.owner,
                responseAddress: msg.responseAddress
            }.toCell()
        });
    }

    fun getJettonWalletInit(address: Address): StateInit {
        return initOf BirdJettonWallet(address, self.jettonMaster);
    }

    get fun get_wallet_data(): JettonWalletDataSpec {
        return JettonWalletDataSpec{
            balance: self.balance,
            ownerAddress: self.owner,
            jettonMasterAddress: self.jettonMaster,
            jettonWalletCode: (self.getJettonWalletInit(self.owner)).code
        };
    }
}

// -------------------------------------------------------------
// DATA STRUCTS
// -------------------------------------------------------------
struct JettonWalletDataSpec {
    balance: Int;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
}

struct JettonDataSpec {
    totalSupply: Int;
    mintable: Bool;
    adminAddress: Address;
    jettonContent: Cell;
    jettonWalletCode: Cell;
}
