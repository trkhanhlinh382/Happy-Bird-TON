// BirdJetton.tact
import "@stdlib/deploy";
import "@stdlib/ownable";

message Mint {
    amount: Int;
    receiver: Address;
}

message Burn {
    amount: Int;
}

contract BirdJettonMinter with Deployable, Ownable {
    owner: Address;
    totalSupply: Int;
    name: String;
    symbol: String;
    decimals: Int;
    description: String;
    image: String;
    
    init(owner: Address) {
        self.owner = owner;
        self.totalSupply = 0;
        self.name = "BIRD Token";
        self.symbol = "BIRD";
        self.decimals = 9;
        self.description = "Reward token for Happy Bird game";
        self.image = "https://yourdomain.com/bird.png"; // Replace with your domain's image
    }

    // Handles Minting request from Authorized contracts (like BirdReward contract)
    receive(msg: Mint) {
        self.requireOwner();
        self.totalSupply = self.totalSupply + msg.amount;
        
        // Reply with comments
        self.reply("Minted successfully".asComment());
    }

    // Handles Burning tokens
    receive(msg: Burn) {
        self.requireOwner();
        require(self.totalSupply >= msg.amount, "Insufficient total supply");
        self.totalSupply = self.totalSupply - msg.amount;
    }

    // Getter for Minter specifications
    get fun get_jetton_data(): JettonDataSpec {
        return JettonDataSpec{
            totalSupply: self.totalSupply,
            mintable: true,
            adminAddress: self.owner,
            jettonContent: emptyCell(),
            jettonWalletCode: emptyCell()
        };
    }
}

struct JettonDataSpec {
    totalSupply: Int;
    mintable: Bool;
    adminAddress: Address;
    jettonContent: Cell;
    jettonWalletCode: Cell;
}
