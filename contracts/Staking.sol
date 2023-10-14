// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Inheritance
import "./interfaces/IStakingRewards.sol";
import "./RewardsDistributionRecipient.sol";
import "hardhat/console.sol";

contract Staking is RewardsDistributionRecipient, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ========== ACCURACY CONSTS ========== */

    uint256 constant public AMOUNT_MULTIPLIER = 1e4;
    uint256 constant public INIT_MULTIPLIER_VALUE = 1e10;
    uint8 constant public VESTING_CONST = 1e1;

    /* ========== STATE VARIABLES ========== */

    IERC20 public stakingToken;
    IERC20 public rewardsToken;
    uint256 public ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    uint256 public tokenPeriodFinish;
    uint256 public tokenRewardRate = 0;
    uint256 public tokenRewardsDuration = 50; // TODO 60 days
    uint256 public tokenMultiplierStored = 0;
    uint256 public lastUpdateTime;

    uint256 public nativePeriodFinish = 0;
    uint256 public nativeRewardRate = 0;
    uint256 public nativeRewardsDuration = 50;
    uint256 public nativeMultiplierStored = INIT_MULTIPLIER_VALUE;

    uint256 public lastPoolUpdateTime = 1e18;
    uint256 public lastBPUpdateTime = 1e18;

    mapping(address => uint256) public userTokenMultiplierPaid;
    mapping(address => uint256) public userNativeMultiplierPaid;
    mapping(address => uint256) public userBPTimePaid;

    uint256 private totalSupplyLP;
    uint256 private totalSupplyBP;
    uint256 private totalSupplyST;

    mapping(address => uint256) public balanceLP;
    mapping(address => uint256) private balanceST;
    mapping(address => uint256) private rewards;
    mapping(address => uint256) private balanceBP;

    uint256 m = INIT_MULTIPLIER_VALUE;

    mapping(address => uint256) private mPaid;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken
    ) {
        rewardsToken = IERC20(_rewardsToken);
        stakingToken = IERC20(_stakingToken);
        rewardsDistribution = _rewardsDistribution;
    }


    function balanceLPOf(address account) external view returns (uint256) {
        return balanceLP[account] / AMOUNT_MULTIPLIER;
    }

    function balanceSTOf(address account) external view returns (uint256) {
        return balanceST[account] / AMOUNT_MULTIPLIER;
    }

    // =====================USEFUL VIEWS==============================

    function lastTimeTokenRewardApplicable() public view returns (uint256) {
        return tokenPeriodFinish == 0 ? block.timestamp : Math.min(block.timestamp, tokenPeriodFinish);
    }

    function lastTimeNativeRewardApplicable() public view returns (uint256) {
        return nativePeriodFinish == 0 ? block.timestamp : Math.min(block.timestamp, nativePeriodFinish);
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return
            Math.min(
                block.timestamp,
                Math.max(tokenPeriodFinish, nativePeriodFinish)
            );
    }

    function getM() public view returns (uint256) {
        if (totalSupplyLP + totalSupplyST + totalSupplyBP == 0) {
            return m;
        }

        // console.log("<-----------getM---------------->");
        // console.log("lastTimeTokenRewardApplicable() - lastUpdateTime", lastTimeTokenRewardApplicable() - lastUpdateTime);
        
        // console.log("getm1: ", (nativeRewardRate) * (lastTimeTokenRewardApplicable() - lastUpdateTime) * m);
        // console.log("getm2: ", (totalSupplyBP + totalSupplyLP + totalSupplyST));
        // console.log("<---------end--getM---------------->");


        return
            m +
            (nativeRewardRate) *
            (lastTimeNativeRewardApplicable() - Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime)) *
            m /
            (totalSupplyBP + totalSupplyLP + totalSupplyST);
    }

    function getNativeMultiplier() public view returns (uint256) {
        if (totalSupplyLP + totalSupplyST + totalSupplyBP == 0) {
            return nativeMultiplierStored;
        }

        // console.log("<-----------getNM---------------->");
        // console.log("lTNRA: ", lastTimeNativeRewardApplicable());
        // console.log("lUT: ", lastUpdateTime);
        // console.log("lastTimeNativeRewardApplicable() - lastUpdateTime", lastTimeNativeRewardApplicable() - Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime));
        
        // console.log("nativeMultiplierStored: ", nativeMultiplierStored);
        // console.log("getm2: ", (totalSupplyBP + totalSupplyLP + totalSupplyST));
        // console.log("<---------end--getNM---------------->");

        return nativeMultiplierStored + nativeMultiplierStored * (lastTimeNativeRewardApplicable() - Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime)) * nativeRewardRate / (totalSupplyLP + totalSupplyBP + totalSupplyST);
    }

    function getTokenMultiplier() public view returns (uint256) {
        if (totalSupplyLP + totalSupplyST + totalSupplyBP == 0) {
            return tokenMultiplierStored;
        }

        // console.log("<-----------getTM---------------->");
        // console.log("lTTRA: ", lastTimeTokenRewardApplicable());
        // console.log("lUT: ", lastUpdateTime);
        // // console.log("lastTimeTokenRewardApplicable() - lastUpdateTime", lastTimeTokenRewardApplicable() - lastUpdateTime);
        // console.log("tMS: ", tokenMultiplierStored);
        // console.log("get TS: ", (totalSupplyBP + totalSupplyLP + totalSupplyST));
        // console.log("<---------end--getTM---------------->");

        return tokenMultiplierStored +
            (lastTimeTokenRewardApplicable() - Math.min(lastTimeTokenRewardApplicable(), lastUpdateTime)) * m /
            (totalSupplyBP + totalSupplyLP + totalSupplyST);
    }

    function tokenEarned(address account) public view returns (uint256) {
        // console.log("\n", "<-------earned------->");
        // console.log("balanceLP[acc]: ", balanceLP[account]);
        // console.log("userBP[acc]: ", balanceBP[account]);
        // console.log("st[acc]: ", balanceST[account]);
        // console.log("<------end-earned------->");
        return
            (balanceLP[account] + balanceST[account] + balanceBP[account]) *
                tokenRewardRate *
                (getTokenMultiplier() - userTokenMultiplierPaid[account]) / Math.max(mPaid[account], INIT_MULTIPLIER_VALUE);
    }

    function nativeEarned(address account) public view returns (uint256) {
        return
            ((balanceLP[account] + balanceST[account] + balanceBP[account]) *
                getNativeMultiplier()) /
            Math.max(userNativeMultiplierPaid[account], INIT_MULTIPLIER_VALUE);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(
        uint256 amount
    )
        external
        nonReentrant
        updateReward(msg.sender)
    {
        require(amount > 0, "Cannot stake 0");
        amount *= AMOUNT_MULTIPLIER;

        balanceLP[msg.sender] += amount;
        totalSupplyLP += amount;

        stakingToken.safeTransferFrom(
            msg.sender,
            address(this),
            amount / AMOUNT_MULTIPLIER
        );
        emit Staked(msg.sender, amount);
    }

    function withdraw(
        uint256 amount
    )
        public
        nonReentrant
        updateReward(msg.sender)
    {
        require(amount > 0, "Cannot withdraw 0");

        balanceLP[msg.sender] -= amount * AMOUNT_MULTIPLIER;
        totalSupplyLP -= amount * AMOUNT_MULTIPLIER;

        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward()
        public
        nonReentrant
        updateReward(msg.sender)
    {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(
                msg.sender,
                reward / AMOUNT_MULTIPLIER / INIT_MULTIPLIER_VALUE
            );
            emit RewardPaid(msg.sender, reward / AMOUNT_MULTIPLIER / INIT_MULTIPLIER_VALUE);
        }
    }

    function vest(uint amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot vest 0");

        uint256 balance = balanceST[msg.sender];

        require(amount <= balance, "Cannot vest more then balance");
        require(
            amount * VESTING_CONST < balanceLP[msg.sender],
            "You should have more staked LP tokens"
        );

        balanceST[msg.sender] -= amount;

        // TODO vesting

        emit Vesting(msg.sender, amount);
    }

    function compound() external updateReward(msg.sender) { 
        // hui
    }

    function exit() external {
        withdraw(balanceLP[msg.sender] / AMOUNT_MULTIPLIER);
        getReward();
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function notifyTokenRewardAmount(
        uint256 reward
    ) external override onlyRewardsDistribution updateReward(address(0)) {
        if (block.timestamp >= tokenPeriodFinish) {
            tokenRewardRate = reward / tokenRewardsDuration;
        } else {
            uint256 remaining = tokenPeriodFinish - block.timestamp;
            uint256 leftover = remaining * tokenRewardRate;
            tokenRewardRate = (reward + leftover) / tokenRewardsDuration;
        }

        uint balance = rewardsToken.balanceOf(address(this));
        require(
            tokenRewardRate <= balance / tokenRewardsDuration,
            "Provided reward too high"
        );

        tokenRewardRate *= AMOUNT_MULTIPLIER;
        lastUpdateTime = block.timestamp;

        tokenPeriodFinish = block.timestamp + tokenRewardsDuration;
        emit TokenRewardAdded(reward);
    }

    function notifyNativeRewardAmount(
        uint256 amount
    )
        external
        payable
        override
        onlyRewardsDistribution
        updateReward(address(0))
    {
        if (block.timestamp >= nativePeriodFinish) {
            nativeRewardRate = amount / nativeRewardsDuration;
        } else {
            uint256 remaining = nativePeriodFinish - block.timestamp;
            uint256 leftover = remaining * nativeRewardRate;
            nativeRewardRate = (amount + leftover) / nativeRewardsDuration;
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = address(this).balance;
        require(
            nativeRewardRate <= balance / nativeRewardsDuration,
            "Provided reward too high"
        );

        nativeRewardRate *= AMOUNT_MULTIPLIER;
        lastUpdateTime = block.timestamp;
        nativePeriodFinish = block.timestamp + nativeRewardsDuration;
        emit NativeRewardAdded(amount);
    }



    modifier updateReward(address account) {
        tokenMultiplierStored = getTokenMultiplier();
        nativeMultiplierStored = getNativeMultiplier();

        m = getM();

        lastUpdateTime = lastTimeRewardApplicable();

        if (account != address(0)) {
            rewards[account] = tokenEarned(account);
            balanceST[account] = nativeEarned(account) - balanceLP[account] - balanceBP[account];

            userTokenMultiplierPaid[account] = tokenMultiplierStored;
            userNativeMultiplierPaid[account] = nativeMultiplierStored;

            if (nativePeriodFinish != 0) {
                totalSupplyST +=
                    (lastTimeNativeRewardApplicable() -
                        Math.min(lastPoolUpdateTime, Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime))) *
                    nativeRewardRate;
            }

            totalSupplyBP +=
                (lastTimeRewardApplicable() -
                    Math.min(userBPTimePaid[account], lastUpdateTime)) *
                balanceLP[account];

            balanceBP[account] +=
                (lastTimeRewardApplicable() -
                    Math.min(userBPTimePaid[account], lastUpdateTime)) *
                balanceLP[account];

            lastPoolUpdateTime = lastUpdateTime;
            userBPTimePaid[account] = lastUpdateTime;

            mPaid[account] = m;
        }

        // console.log("<---------------updRewDEBUG---------->");
        // console.log("rewards[addr]", rewards[account], account);
        // console.log("lp[addr]", balanceLP[account]);
        // console.log("bp[addr]", balanceBP[account]);
        // console.log("st[addr]", balanceST[account]);

        // console.log("lp total", totalSupplyLP);
        // console.log("bp total", totalSupplyBP);
        // console.log("st total", totalSupplyST);

        // console.log("m", m);
        // console.log("<------------END---updRewDEBUG---------->");

        _;
    }

    /* ========== EVENTS ========== */

    event TokenRewardAdded(uint256 reward);
    event NativeRewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event Vesting(address indexed user, uint256 reward);
}