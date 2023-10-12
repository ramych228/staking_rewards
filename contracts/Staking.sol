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

    uint256 public AMOUNT_MULTIPLIER = 1e4;

    /* ========== STATE VARIABLES ========== */

    IERC20 public stakingToken;
    IERC20 public rewardsToken;

    uint256 public tokenPeriodFinish;
    uint256 public tokenRewardRate = 0;
    uint256 public tokenRewardsDuration = 50;
    uint256 public tokenMultiplierStored = 0;
    uint256 public lastUpdateTime;

    uint256 public nativePeriodFinish = 0;
    uint256 public nativeRewardRate = 0;
    uint256 public nativeRewardsDuration = 50;
    uint256 public nativeMultiplierStored = 1e18;

    uint256 public lastPoolUpdateTime = 1e18;
    uint256 public lastBPUpdateTime = 1e18;

    mapping(address => uint256) public userTokenMultiplierPaid;
    mapping(address => uint256) public userNativeMultiplierPaid;
    mapping(address => uint256) public userBPTimePaid;

    uint256 private totalSupplyLP;
    uint256 private totalSupplyBP;
    uint256 private totalSupplyST;

    mapping(address => uint256) private balanceLP;
    mapping(address => uint256) private balanceST;
    mapping(address => uint256) private rewards;
    mapping(address => uint256) private balanceBP;

    uint256 m = 1e18;

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

    /* ========CUSTOM VIEWS======= */

    function _AMOUNT_MULTIPLIER() external view returns (uint256) {
        return AMOUNT_MULTIPLIER;
    }

    function _tokenPeriodFinish() external view returns (uint256) {
        return tokenPeriodFinish;
    }

    function _nativePeriodFinish() external view returns (uint256) {
        return nativePeriodFinish;
    }

    function _lastUpdateTime() external view returns (uint256) {
        return lastUpdateTime;
    }

    function _tokenRewardRate() external view returns (uint256) {
        return tokenRewardRate;
    }
    
    function _nativeRewardRate() external view returns (uint256) {
        return nativeRewardRate;
    }

    function _nativeMultiplierStored() external view returns (uint256) {
        return nativeMultiplierStored;
    }

    function _time() external view returns (uint256) {
        return block.timestamp;
    }

    /* ========== VIEWS ========== */

    function _totalSupplyLP() external view returns (uint256) {
        return totalSupplyLP;
    }

    function _totalSupplyST() external view returns (uint256) {
        return totalSupplyST;
    }

    function _totalSupplyBP() external view returns (uint256) {
        return totalSupplyBP;
    }

    function balanceLPOf(address account) external view returns (uint256) {
        return balanceLP[account] / AMOUNT_MULTIPLIER;
    }

    function balanceSTOf(address account) external view returns (uint256) {
        return balanceST[account] / AMOUNT_MULTIPLIER;
    }

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

        // console.log("getm1: ", (nativeRewardRate + totalSupplyLP) * (lastTimeTokenRewardApplicable() - lastUpdateTime) * m);
        // console.log("getm2: ", (totalSupplyBP + totalSupplyLP + totalSupplyST));

        return
            m +
            ((nativeRewardRate + totalSupplyLP) *
                (lastTimeTokenRewardApplicable() - lastUpdateTime) *
                m) /
            (totalSupplyBP + totalSupplyLP + totalSupplyST);
    }

    function getNativeMultiplier() public view returns (uint256) {
        if (totalSupplyLP + totalSupplyST == 0) {
            return nativeMultiplierStored;
        }

        console.log("nativem: ", nativeMultiplierStored);

        console.log("nativem1: ", nativeMultiplierStored *
                (
                    1 + (((lastTimeNativeRewardApplicable() - lastUpdateTime) * nativeRewardRate)
                )));
        
        console.log("nativem2: ", (totalSupplyLP + totalSupplyST));
        console.log("TIMEEE: ", (lastTimeNativeRewardApplicable() - lastUpdateTime));
        console.log("nRR:", nativeRewardRate);
        return (nativeMultiplierStored *
            (1 +
                (
                    ((lastTimeNativeRewardApplicable() - lastUpdateTime) *
                        nativeRewardRate)
                ) /
                (totalSupplyLP + totalSupplyST)));
    }

    function getTokenMultiplier() public view returns (uint256) {
        if (totalSupplyLP + totalSupplyST + totalSupplyBP == 0) {
            return tokenMultiplierStored;
        }

        return (tokenMultiplierStored +
            ((lastTimeTokenRewardApplicable() - lastUpdateTime) * m) /
            (totalSupplyBP + totalSupplyLP + totalSupplyST));
    }

    function tokenEarned(address account) public view returns (uint256) {
        console.log("\n", "<-------earned------->");
        console.log("balanceLP[acc]: ", balanceLP[account]);
        console.log("userBP[acc]: ", balanceBP[account]);
        console.log("st[acc]: ", balanceST[account]);
        console.log("<------end-earned------->");
        return
            ((balanceLP[account] + balanceST[account] + balanceBP[account]) *
                tokenRewardRate *
                getTokenMultiplier()) / Math.max(mPaid[account], 1e18);
    }

    function nativeEarned(address account) public view returns (uint256) {
        return
            ((balanceLP[account] + balanceST[account]) *
                getNativeMultiplier()) /
            Math.max(userNativeMultiplierPaid[account], 1e18);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(
        uint256 amount
    )
        external
        nonReentrant
        //updateNativeReward(msg.sender)
        //updateTokenReward(msg.sender)
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
        // updateNativeReward(msg.sender)
        // updateTokenReward(msg.sender)
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
        // updateNativeReward(msg.sender)
        // updateTokenReward(msg.sender)
        updateReward(msg.sender)
    {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(
                msg.sender,
                reward / AMOUNT_MULTIPLIER / 1e18
            );
            emit RewardPaid(msg.sender, reward / AMOUNT_MULTIPLIER / 1e18);
        }
    }

    function vest(uint amount) public updateReward(msg.sender) {
        // require(amount > 0, "Cannot vest 0");

        uint256 balance = balanceST[msg.sender];

        require(amount <= balance, "Cannot vest more then balance");
        require(
            amount * 10 < balanceLP[msg.sender],
            "You should have more staked LP tokens"
        );

        balanceST[msg.sender] -= amount;

        // TODO vesting

        emit Vesting(msg.sender, amount);
    }

    function exit() external {
        withdraw(balanceLP[msg.sender] / AMOUNT_MULTIPLIER);
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

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = rewardsToken.balanceOf(address(this));
        require(
            tokenRewardRate <= balance / tokenRewardsDuration,
            "Provided reward too high"
        );

        tokenRewardRate *= AMOUNT_MULTIPLIER;
        // lastUpdateTime = block.timestamp;
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

    /* ========== MODIFIERS ========== */

    // modifier updateTokenReward(address account) {
    //     tokenMultiplierStored = getTokenMultiplier();
    //     lastUpdateTime = lastTimeTokenRewardApplicable();

    //     if (account != address(0)) {
    //         rewards[account] = tokenEarned(account);
    //         userTokenMultiplierPaid[account] = tokenMultiplierStored;

    //         totalSupplyBP +=
    //             (lastTimeTokenRewardApplicable() -
    //                 Math.min(lastBPUpdateTime, lastUpdateTime)) *
    //             totalSupplyLP;

    //         console.log(
    //             "time: ",
    //             lastTimeTokenRewardApplicable() -
    //                 Math.min(lastBPUpdateTime, lastUpdateTime)
    //         );

    //         balanceBP[account] +=
    //             (lastTimeTokenRewardApplicable() -
    //                 Math.min(userBPTimePaid[account], lastUpdateTime)) *
    //             balanceLP[account];

    //         lastBPUpdateTime = lastUpdateTime;
    //         userBPTimePaid[account] = lastUpdateTime;
    //     }
    //     console.log("\n");
    //     console.log("<--------------------------->");
    //     console.log("tokenMultiplierStored: ", tokenMultiplierStored);
    //     console.log("rewards[account]: ", rewards[account], account);
    //     console.log("user bp balance:", balanceBP[account]);
    //     console.log("lp balance:", balanceLP[account]);
    //     console.log("bp supply:", totalSupplyBP);
    //     console.log("lp supply:", totalSupplyLP);
    //     console.log("<--------------------------->");

    //     _;
    // }

    // modifier updateNativeReward(address account) {
    //     nativeMultiplierStored = getNativeMultiplier();

    //     lastUpdateTime = lastTimeNativeRewardApplicable();

    //     if (account != address(0)) {
    //         balanceST[account] = nativeEarned(account) - balanceLP[account];
    //         userNativeMultiplierPaid[account] = nativeMultiplierStored;

    //         totalSupplyST +=
    //             (lastTimeNativeRewardApplicable() -
    //                 Math.min(lastPoolUpdateTime, lastUpdateTime)) *
    //             nativeRewardRate;
    //         lastPoolUpdateTime = lastUpdateTime;
    //     }

        // console.log("\n");
        // console.log("<--------------------------->");
        // console.log("nativeMultiplierStored: ", nativeMultiplierStored);
        // console.log(
        //     "balanceST[account]: ",
        //     balanceST[account],
        //     account
        // );
        // console.log("lp balance:", balanceLP[account]);
        // console.log("<--------------------------->");

        // _;
    // }

    modifier updateReward(address account) {
        tokenMultiplierStored = getTokenMultiplier();
        nativeMultiplierStored = getNativeMultiplier();
        m = getM();

        lastUpdateTime = lastTimeRewardApplicable();

        if (account != address(0)) {
            rewards[account] = tokenEarned(account);
            balanceST[account] = nativeEarned(account) - balanceLP[account];

            userTokenMultiplierPaid[account] = tokenMultiplierStored;
            userNativeMultiplierPaid[account] = nativeMultiplierStored;

            if (nativePeriodFinish != 0) {
                totalSupplyST +=
                    (lastTimeNativeRewardApplicable() -
                        Math.min(lastPoolUpdateTime, lastUpdateTime)) *
                    nativeRewardRate;
            }

            totalSupplyBP +=
                (lastTimeRewardApplicable() -
                    Math.min(lastPoolUpdateTime, lastUpdateTime)) *
                totalSupplyLP;

            balanceBP[account] +=
                (lastTimeRewardApplicable() -
                    Math.min(userBPTimePaid[account], lastUpdateTime)) *
                balanceLP[account];

            lastPoolUpdateTime = lastUpdateTime;
            userBPTimePaid[account] = lastUpdateTime;

            mPaid[account] = m;
        }

        console.log("<---------------updRewDEBUG---------->");
        console.log("rewards[addr]", rewards[account], account);
        console.log("lp[addr]", balanceLP[account]);
        console.log("bp[addr]", balanceBP[account]);
        console.log("st[addr]", balanceST[account]);

        console.log("lp total", totalSupplyLP);
        console.log("bp total", totalSupplyBP);
        console.log("st total", totalSupplyST);

        console.log("m", m);
        console.log("<------------END---updRewDEBUG---------->");

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
