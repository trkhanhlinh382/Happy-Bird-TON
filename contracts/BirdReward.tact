// BirdReward.tact
import "@stdlib/deploy";
import "@stdlib/ownable";

message Mint {
    amount: Int;
    receiver: Address;
}

message UpdateScore {
    user: Address;
    score: Int;
}

message ClaimCheckin {}

message ClaimMission3Games {}

message ClaimNewRecord {
    score: Int;
}

message Claim100 {
    score: Int;
}

message ClaimTop {
    period: String;
}

contract BirdReward with Deployable, Ownable {
    owner: Address; // Administrative owner
    admin: Address; // Server backend address for scoring signature validation
    jettonMinter: Address; // Address of BirdJettonMinter contract

    scores: Map<Address, Int>;
    lastCheckinDay: Map<Address, Int>;
    dailyGames: Map<Address, Int>;
    lastClaimedTopDay: Map<Address, Int>;
    lastClaimedTopWeek: Map<Address, Int>;
    lastClaimedTopMonth: Map<Address, Int>;
    claim100Today: Map<Address, Int>;

    init(admin: Address, jettonMinter: Address) {
        self.owner = sender();
        self.admin = admin;
        self.jettonMinter = jettonMinter;
    }

    // Admin updates player best score
    receive(msg: UpdateScore) {
        require(sender() == self.admin || sender() == self.owner, "Access denied: Unauthorized score reporter");
        let currentScore: Int = self.scores.get(msg.user) ?? 0;
        if (msg.score > currentScore) {
            self.scores.set(msg.user, msg.score);
        }
    }

    // Daily check-in: plays first game of the day
    receive(msg: ClaimCheckin) {
        let user: Address = sender();
        let day: Int = now() / 86400;
        let lastCheckin: Int = self.lastCheckinDay.get(user) ?? 0;
        require(lastCheckin < day, "Status check-in: Already claimed check-in rewards today");
        
        self.lastCheckinDay.set(user, day);
        
        // Rewards 10 BIRD
        self.sendBird(user, 10 * 1000000000);
    }

    // Quest: Complete 3 games today
    receive(msg: ClaimMission3Games) {
        let user: Address = sender();
        let day: Int = now() / 86400;
        
        let games: Int = self.dailyGames.get(user) ?? 0;
        require(games >= 3, "Quest incomplete: Complete at least 3 flights");

        let lastCheckin: Int = self.lastCheckinDay.get(user) ?? 0;
        require(lastCheckin < day, "Quest already claimed today");

        self.lastCheckinDay.set(user, day);
        
        // Rewards 50 BIRD
        self.sendBird(user, 50 * 1000000000);
    }

    // Quest: Break own record
    receive(msg: ClaimNewRecord) {
        let user: Address = sender();
        let currentScore: Int = self.scores.get(user) ?? 0;
        
        require(msg.score > currentScore, "Quest incomplete: Score must be higher than personal best");
        self.scores.set(user, msg.score);
        
        // Rewards 100 BIRD
        self.sendBird(user, 100 * 1000000000);
    }

    // Quest: Earn 100 points
    receive(msg: Claim100) {
        let user: Address = sender();
        let day: Int = now() / 86400;
        
        require(msg.score >= 100, "Quest incomplete: Score must be 100 points or above");
        
        let claimedToday: Int = self.claim100Today.get(user) ?? 0;
        require(claimedToday < 3, "Quest limit: Claimed 100-point quest 3 times today");
        
        self.claim100Today.set(user, claimedToday + 1);
        
        // Rewards 150 BIRD
        self.sendBird(user, 150 * 1000000000);
    }

    // Top 10 day/week/month estimation claiming
    receive(msg: ClaimTop) {
        let user: Address = sender();
        let day: Int = now() / 86400;

        if (msg.period == "day") {
            let lastClaim: Int = self.lastClaimedTopDay.get(user) ?? 0;
            require(lastClaim < day, "Already claimed Top 10 Daily rewards today");
            
            self.lastClaimedTopDay.set(user, day);
            self.sendBird(user, 50 * 1000000000); // 50 BIRD for Daily Top 10

        } else if (msg.period == "week") {
            let week: Int = day / 7;
            let lastClaim: Int = self.lastClaimedTopWeek.get(user) ?? 0;
            require(lastClaim < week, "Already claimed Top 10 Weekly rewards this week");
            
            self.lastClaimedTopWeek.set(user, week);
            self.sendBird(user, 150 * 1000000000); // 150 BIRD for Weekly Top 10

        } else if (msg.period == "month") {
            let month: Int = day / 30;
            let lastClaim: Int = self.lastClaimedTopMonth.get(user) ?? 0;
            require(lastClaim < month, "Already claimed Top 10 Monthly rewards this month");
            
            self.lastClaimedTopMonth.set(user, month);
            self.sendBird(user, 500 * 1000000000); // 500 BIRD for Monthly Top 10
        }
    }

    // internal helper to send Mint message to the BirdJettonMinter contract
    fun sendBird(to: Address, amount: Int) {
        send(SendParameters{
            to: self.jettonMinter,
            value: 0, 
            bounce: true,
            mode: SendRemainingValue,
            body: Mint{amount: amount, receiver: to}.toCell()
        });
    }

    // Getters for frontend integration
    get fun get_score(user: Address): Int {
        return self.scores.get(user) ?? 0;
    }

    get fun get_checkin_day(user: Address): Int {
        return self.lastCheckinDay.get(user) ?? 0;
    }
}
