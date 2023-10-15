// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.19;



import '@openzeppelin/contracts/utils/math/Math.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

// Inheritance
import './interfaces/IStakingRewards.sol';
import './RewardsDistributionRecipient.sol';
import 'hardhat/console.sol';

/// @title Complicated staking contract
/// @author Monty C. Python
contract Staking is RewardsDistributionRecipient, ReentrancyGuard {
	using SafeERC20 for IERC20;

	/* ========== CONSTANTS ========== */

	uint256 public constant AMOUNT_MULTIPLIER = 1e4;
	uint256 public constant INIT_MULTIPLIER_VALUE = 1e30;
	uint8 public constant VESTING_CONST = 1e1;

	/* ========== STATE VARIABLES ========== */

	IERC20 public stakingToken;
	IERC20 public rewardsToken;
	uint256 public ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

	uint256 public tokenPeriodFinish; // finish of tokens earning
	uint256 public tokenRewardRate = 0; // how many tokens are given to pool every second
	uint256 public tokenRewardsDuration = 50; // TODO 60 days
	uint256 public lastUpdateTime = type(uint256).max; // last update of everything stored (check updateReward modifier)

	uint256 public nativePeriodFinish = 0;
	uint256 public nativeRewardRate = 0;
	uint256 public nativeRewardsDuration = 50;
	

	uint256 public lastPoolUpdateTime = type(uint256).max;
	uint256 public lastBPUpdateTime = type(uint256).max;

	struct UserVariables {
		uint256 userTokenMultiplierPaid;
		uint256 userNativeMultiplierPaid;
		uint256 userLastUpdateTime;
		uint256 balanceLP;
		uint256 balanceST;
		uint256 balanceBP;
		uint256 balanceNC;
		uint256 balanceVST;
		uint256 rewards;
		uint256 balanceMultiplierPaid;
		uint256 vestingFinishTime;
	}

	mapping(address => UserVariables) public userVariables;

	uint256 public totalSupplyLP;
	uint256 public totalSupplyBP;
	uint256 public totalSupplyST;

	uint256 public balanceMultiplierStored = INIT_MULTIPLIER_VALUE;
    uint256 public nativeMultiplierStored = INIT_MULTIPLIER_VALUE;
    uint256 public tokenMultiplierStored = 0;

	/* ========== CONSTRUCTOR ========== */

	constructor(address _rewardsDistribution, address _rewardsToken, address _stakingToken) {
		rewardsToken = IERC20(_rewardsToken);
		stakingToken = IERC20(_stakingToken);
		rewardsDistribution = _rewardsDistribution;
	}

	function balanceLPOf(address account) external view returns (uint256) {
		return userVariables[account].balanceLP / AMOUNT_MULTIPLIER;
	}

	function balanceSTOf(address account) external view returns (uint256) {
		return userVariables[account].balanceST / AMOUNT_MULTIPLIER;
	}

	// =====================USEFUL VIEWS==============================

	function lastTimeTokenRewardApplicable() public view returns (uint256) {
		return tokenPeriodFinish == 0 ? block.timestamp : Math.min(block.timestamp, tokenPeriodFinish);
	}

	function lastTimeNativeRewardApplicable() public view returns (uint256) {
		return nativePeriodFinish == 0 ? block.timestamp : Math.min(block.timestamp, nativePeriodFinish);
	}

	function lastTimeRewardApplicable() public view returns (uint256) {
		return Math.min(block.timestamp, Math.max(lastTimeTokenRewardApplicable(), lastTimeNativeRewardApplicable()));
	}

	function getBalanceMultiplier() internal view returns (uint256) {
		if (totalSupplyLP + totalSupplyST + totalSupplyBP == 0) {
			return balanceMultiplierStored;
		}

		// console.log("<-----------getBalanceMultiplier---------------->");
		// console.log("lastTimeTokenRewardApplicable() - lastUpdateTime", lastTimeTokenRewardApplicable() - lastUpdateTime);

		// console.log("getm1: ", (nativeRewardRate) * (lastTimeTokenRewardApplicable() - lastUpdateTime) * balanceMultiplierStored);
		// console.log("getm2: ", (totalSupplyBP + totalSupplyLP + totalSupplyST));
		// console.log("<---------end--getBalanceMultiplier---------------->");

		return
			balanceMultiplierStored +
			((nativeRewardRate) *
				(lastTimeNativeRewardApplicable() - Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime)) *
				balanceMultiplierStored) /
			(totalSupplyBP + totalSupplyLP + totalSupplyST);
	}

	function getNativeMultiplier() internal view returns (uint256) {
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

		return
			nativeMultiplierStored +
			(nativeMultiplierStored *
				(lastTimeNativeRewardApplicable() - Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime)) *
				nativeRewardRate) /
			(totalSupplyLP + totalSupplyBP + totalSupplyST);
	}

	function getTokenMultiplier() internal view returns (uint256) {
		if (totalSupplyLP + totalSupplyST + totalSupplyBP == 0) {
			return tokenMultiplierStored;
		}

		// console.log("<-----------getTM---------------->");
		// console.log("lTTRA: ", lastTimeTokenRewardApplicable());
		// console.log("lUT: ", lastUpdateTime);
		// console.log("time:", lastTimeTokenRewardApplicable() - Math.min(lastTimeTokenRewardApplicable(), lastUpdateTime));
		// console.log("tMS: ", tokenMultiplierStored);
		// console.log("get TS: ", (totalSupplyBP + totalSupplyLP + totalSupplyST));
		// console.log("<---------end--getTM---------------->");

		return
			tokenMultiplierStored +
			((lastTimeTokenRewardApplicable() - Math.min(lastTimeTokenRewardApplicable(), lastUpdateTime)) *
				balanceMultiplierStored) * tokenRewardRate /
			(totalSupplyBP + totalSupplyLP + totalSupplyST);
	}

	function tokenEarned(address account) internal view returns (uint256) {
		// console.log("\n", "<-------earned------->");
		// console.log("balanceLP[acc]: ", userVariables[account].balanceLP);
		// console.log("userBP[acc]: ", userVariables[account].balanceBP);
		// console.log("st[acc]: ", userVariables[account].balanceST);
		// console.log("<------end-earned------->");
		return
			((userVariables[account].balanceLP +
				userVariables[account].balanceST +
				userVariables[account].balanceBP) *
				(getTokenMultiplier() - userVariables[account].userTokenMultiplierPaid)) /
			Math.max(userVariables[account].balanceMultiplierPaid, INIT_MULTIPLIER_VALUE);
	}

	function nativeEarned(address account) internal view returns (uint256) {
		return
			((userVariables[account].balanceLP + userVariables[account].balanceST + userVariables[account].balanceBP) *
				getNativeMultiplier()) /
			Math.max(userVariables[account].userNativeMultiplierPaid, INIT_MULTIPLIER_VALUE);
	}

	/* ========== MUTATIVE FUNCTIONS ========== */

	function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
		require(amount != 0, 'Cannot stake 0');
		amount *= AMOUNT_MULTIPLIER;

		userVariables[msg.sender].balanceLP += amount;
		totalSupplyLP += amount;

		stakingToken.safeTransferFrom(msg.sender, address(this), amount / AMOUNT_MULTIPLIER);
		emit Staked(msg.sender, amount);
	}

	function getNativeReward() public nonReentrant updateReward(msg.sender) {
		uint256 reward = userVariables[msg.sender].balanceNC;
		if (reward > 0) {
			userVariables[msg.sender].balanceNC = 0;

			(bool sent, ) = msg.sender.call{value: reward / AMOUNT_MULTIPLIER}('');

			require(sent, 'Error. Native currency not sent.');

			emit RewardPaid(msg.sender, reward / AMOUNT_MULTIPLIER);
		}
	}

	function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
		require(amount != 0, 'Cannot withdraw 0');

		userVariables[msg.sender].balanceLP -= amount * AMOUNT_MULTIPLIER;
		totalSupplyLP -= amount * AMOUNT_MULTIPLIER;

		totalSupplyBP -= userVariables[msg.sender].balanceBP;
		userVariables[msg.sender].balanceBP = 0;

		stakingToken.safeTransfer(msg.sender, amount);
		emit Withdrawn(msg.sender, amount);
	}

	function getReward() public nonReentrant updateReward(msg.sender) {
		uint256 reward = userVariables[msg.sender].rewards;
		if (reward > 0) {
			userVariables[msg.sender].rewards = 0;
			rewardsToken.safeTransfer(msg.sender, reward / AMOUNT_MULTIPLIER);
			emit RewardPaid(msg.sender, reward / AMOUNT_MULTIPLIER);
		}
	}

	function vest(uint amount) public nonReentrant updateReward(msg.sender) {
		require(amount != 0, 'Cannot vest 0');

		uint256 balance = userVariables[msg.sender].balanceST;

		require(amount <= balance, 'Cannot vest more then balance');
		require(amount * VESTING_CONST < userVariables[msg.sender].balanceLP, 'You should have more staked LP tokens');

		userVariables[msg.sender].balanceST -= amount;
		userVariables[msg.sender].balanceVST += amount;

		userVariables[msg.sender].vestingFinishTime = block.timestamp + ONE_YEAR_IN_SECS;

		emit Vesting(msg.sender, amount);
	}

	function compound() external updateReward(msg.sender) {
		// hui
	}

	function exit() external {
		withdraw(userVariables[msg.sender].balanceLP / AMOUNT_MULTIPLIER);
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
		require(tokenRewardRate <= balance * AMOUNT_MULTIPLIER / tokenRewardsDuration, 'Provided reward too high');

		tokenRewardRate *= AMOUNT_MULTIPLIER;
		lastUpdateTime = block.timestamp;

		tokenPeriodFinish = block.timestamp + tokenRewardsDuration;
		emit TokenRewardAdded(reward);
	}

	function notifyNativeRewardAmount(
		uint256 amount
	) external payable override onlyRewardsDistribution updateReward(address(0)) {
		if (block.timestamp >= nativePeriodFinish) {
			nativeRewardRate = amount / nativeRewardsDuration;
		} else {
			uint256 remaining = nativePeriodFinish - block.timestamp;
			uint256 leftover = remaining * nativeRewardRate;
			nativeRewardRate = (amount + leftover) / nativeRewardsDuration;
		}

		uint balance = address(this).balance;
		require(nativeRewardRate <= balance * AMOUNT_MULTIPLIER / nativeRewardsDuration, 'Provided reward too high');

		nativeRewardRate *= AMOUNT_MULTIPLIER;
		lastUpdateTime = block.timestamp;
		nativePeriodFinish = block.timestamp + nativeRewardsDuration;
		emit NativeRewardAdded(amount);
	}

	modifier updateReward(address account) {
		updateStoredVariables();

		lastUpdateTime = lastTimeRewardApplicable();

		if (account != address(0)) {
			updateUserVariables(account);

			if (nativePeriodFinish != 0) {
				totalSupplyST +=
					(lastTimeNativeRewardApplicable() -
						Math.min(lastPoolUpdateTime, Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime))) *
					nativeRewardRate;
			}

			updateBonusPoints(account);
			updateVesting(account);

			lastPoolUpdateTime = lastUpdateTime;
			userVariables[account].userLastUpdateTime = lastUpdateTime;
			userVariables[account].balanceMultiplierPaid = balanceMultiplierStored;
		}

		// console.log("<---------------updRewDEBUG---------->");
		// console.log("rewards[addr]", userVariables[account].rewards, account);
		// console.log("lp[addr]", userVariables[account].balanceLP);
		// console.log("bp[addr]", userVariables[account].balanceBP);
		// console.log("st[addr]", userVariables[account].balanceST);

		// console.log("lp total", totalSupplyLP);
		// console.log("bp total", totalSupplyBP);
		// console.log("st total", totalSupplyST);

		// console.log("balanceMultiplierStored", balanceMultiplierStored);
        // console.log("nativeMultiplierStored", nativeMultiplierStored);
        // console.log("tokenMultiplierStored", tokenMultiplierStored);
		// console.log("<------------END---updRewDEBUG---------->");

		_;
	}

	function updateUserVariables(address account) internal {
		userVariables[account].rewards += tokenEarned(account);
		userVariables[account].balanceST =
			nativeEarned(account) -
			userVariables[account].balanceLP -
			userVariables[account].balanceBP;

		userVariables[account].userTokenMultiplierPaid = tokenMultiplierStored;
		userVariables[account].userNativeMultiplierPaid = nativeMultiplierStored;
	}

	function updateStoredVariables() internal {
		tokenMultiplierStored = getTokenMultiplier();
		nativeMultiplierStored = getNativeMultiplier();

		balanceMultiplierStored = getBalanceMultiplier();
	}

	function updateBonusPoints(address account) internal {
		totalSupplyBP +=
			(lastTimeRewardApplicable() - Math.min(userVariables[account].userLastUpdateTime, lastUpdateTime)) *
			userVariables[account].balanceLP / ONE_YEAR_IN_SECS;

		userVariables[account].balanceBP +=
			(lastTimeRewardApplicable() - Math.min(userVariables[account].userLastUpdateTime, lastUpdateTime)) *
			userVariables[account].balanceLP / ONE_YEAR_IN_SECS;
	}

	function updateVesting(address account) internal {
		if (
			(Math.min(block.timestamp, userVariables[account].vestingFinishTime) <
				userVariables[account].userLastUpdateTime)
		) {
			return;
		}

		userVariables[account].balanceVST -=
			((Math.min(block.timestamp, userVariables[account].vestingFinishTime) -
				userVariables[account].userLastUpdateTime) *
				Math.min(userVariables[account].balanceVST, userVariables[account].balanceLP / 10)) /
			ONE_YEAR_IN_SECS;

		userVariables[account].balanceNC +=
			((Math.min(block.timestamp, userVariables[account].vestingFinishTime) -
				userVariables[account].userLastUpdateTime) *
				Math.min(userVariables[account].balanceVST, userVariables[account].balanceLP / 10)) /
			ONE_YEAR_IN_SECS;
	}

	/* ========== EVENTS ========== */

	event TokenRewardAdded(uint256 reward);
	event NativeRewardAdded(uint256 reward);
	event Staked(address indexed user, uint256 amount);
	event Withdrawn(address indexed user, uint256 amount);
	event RewardPaid(address indexed user, uint256 reward);
	event Vesting(address indexed user, uint256 reward);
}