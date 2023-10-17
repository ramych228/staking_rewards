// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.19;

import '@openzeppelin/contracts/access/Ownable.sol';
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
contract Staking is Ownable, ReentrancyGuard {
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
	uint256 public tokenRewardsDuration = 60 days;
	uint256 public lastUpdateTime = type(uint256).max; // last update of everything stored (check updateReward modifier)

	uint256 public nativePeriodFinish = 0;
	uint256 public nativeRewardRate = 0;
	uint256 public nativeRewardsDuration = 50;

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
		transferOwnership(_rewardsDistribution);
	}

	function balanceBPOf(address account) external view returns (uint256) {
		return userVariables[account].balanceBP / AMOUNT_MULTIPLIER;
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

	function getBalanceMultiplier() public view returns (uint256) {
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

		return
			nativeMultiplierStored +
			(nativeMultiplierStored *
				(lastTimeNativeRewardApplicable() - Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime)) *
				nativeRewardRate) /
			(totalSupplyLP + totalSupplyBP + totalSupplyST);
	}

	function getTokenMultiplier() public view returns (uint256) {
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
			(((lastTimeTokenRewardApplicable() - Math.min(lastTimeTokenRewardApplicable(), lastUpdateTime)) *
				balanceMultiplierStored) * tokenRewardRate) /
			(totalSupplyBP + totalSupplyLP + totalSupplyST);
	}

	function tokenEarned(address account) internal view returns (uint256) {
		// console.log("\n", "<-------earned------->");
		// console.log("balanceLP[acc]: ", userVariables[account].balanceLP);
		// console.log("userBP[acc]: ", userVariables[account].balanceBP);
		// console.log("st[acc]: ", userVariables[account].balanceST);
		// console.log("(getTokenMultiplier() - userVariables[account].userTokenMultiplierPaid):", (getTokenMultiplier() - userVariables[account].userTokenMultiplierPaid));
		// console.log("<------end-earned------->");
		return
			((userVariables[account].balanceLP + userVariables[account].balanceST + userVariables[account].balanceBP) *
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

		stakingToken.safeTransferFrom(msg.sender, address(this), amount);

		amount *= AMOUNT_MULTIPLIER;
		userVariables[msg.sender].balanceLP += amount;
		totalSupplyLP += amount;

		emit Staked(msg.sender, amount / AMOUNT_MULTIPLIER);
	}

	function getNativeReward() public nonReentrant updateReward(msg.sender) {
		uint256 reward = userVariables[msg.sender].balanceNC;
		if (reward > 0) {
			userVariables[msg.sender].balanceNC = 0;

			(bool sent, ) = msg.sender.call{value: reward / AMOUNT_MULTIPLIER}('');

			require(sent, 'Native transfer failed');

			emit TokenRewardPaid(msg.sender, reward / AMOUNT_MULTIPLIER);
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
		if (reward != 0) {
			userVariables[msg.sender].rewards = 0;

			rewardsToken.safeTransfer(msg.sender, reward / AMOUNT_MULTIPLIER);
			emit TokenRewardPaid(msg.sender, reward / AMOUNT_MULTIPLIER);
		}
	}

	function vest(uint amount) public nonReentrant updateReward(msg.sender) {
		amount *= AMOUNT_MULTIPLIER;

		require(amount != 0, 'Cannot vest 0');

		uint256 balance = userVariables[msg.sender].balanceST;

		require(amount <= balance, 'Cannot vest more then balance');
		console.log('Amount', amount);
		console.log('Vesting const', VESTING_CONST);
		console.log('LP', userVariables[msg.sender].balanceLP);
		require(amount * VESTING_CONST <= userVariables[msg.sender].balanceLP, 'You should have more staked LP tokens');

		UserVariables memory userPreviousVariables = userVariables[msg.sender];

		userPreviousVariables.balanceST -= amount;
		totalSupplyST -= amount;

		userPreviousVariables.balanceVST += amount;

		userPreviousVariables.vestingFinishTime = block.timestamp + ONE_YEAR_IN_SECS;

		userVariables[msg.sender] = userPreviousVariables;

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

	function notifyTokenRewardAmount(uint256 reward) external onlyOwner updateReward(address(0)) {
		if (block.timestamp >= tokenPeriodFinish) {
			tokenRewardRate = (reward * AMOUNT_MULTIPLIER) / tokenRewardsDuration;
		} else {
			uint256 remaining = tokenPeriodFinish - block.timestamp;
			uint256 leftover = remaining * tokenRewardRate;
			tokenRewardRate = (reward * AMOUNT_MULTIPLIER + leftover) / tokenRewardsDuration;
		}

		uint balance = rewardsToken.balanceOf(address(this));
		require(tokenRewardRate <= (balance * AMOUNT_MULTIPLIER) / tokenRewardsDuration, 'Provided reward too high');

		lastUpdateTime = block.timestamp;

		tokenPeriodFinish = block.timestamp + tokenRewardsDuration;
		emit TokenRewardAdded(reward);
	}

	function notifyNativeRewardAmount(uint256 amount) external payable onlyOwner updateReward(address(0)) {
		if (block.timestamp >= nativePeriodFinish) {
			nativeRewardRate = (amount * AMOUNT_MULTIPLIER) / nativeRewardsDuration;
		} else {
			uint256 remaining = nativePeriodFinish - block.timestamp;
			uint256 leftover = remaining * nativeRewardRate;
			nativeRewardRate = (amount * AMOUNT_MULTIPLIER + leftover) / nativeRewardsDuration;
		}

		uint balance = address(this).balance;
		require(nativeRewardRate <= (balance * AMOUNT_MULTIPLIER) / nativeRewardsDuration, 'Provided reward too high');

		lastUpdateTime = block.timestamp;
		nativePeriodFinish = block.timestamp + nativeRewardsDuration;
		emit NativeRewardAdded(amount);
	}

	modifier updateReward(address account) {
		UserVariables memory userPreviousVariables = userVariables[account];
		updateStoredVariables();

		// console.log('<---------------updRewDEBUG---------->');
		// console.log('time: ', lastTimeRewardApplicable(), lastUpdateTime);

		totalSupplyST +=
			(lastTimeNativeRewardApplicable() - Math.min(lastTimeNativeRewardApplicable(), lastUpdateTime)) *
			nativeRewardRate;

		lastUpdateTime = lastTimeRewardApplicable();

		if (account != address(0)) {
			userPreviousVariables = updateUserVariables(account, userPreviousVariables);

			userPreviousVariables = updateBonusPoints(account, userPreviousVariables);
			userPreviousVariables = updateVesting(account, userPreviousVariables);

			userPreviousVariables.userLastUpdateTime = lastUpdateTime;
			userPreviousVariables.balanceMultiplierPaid = balanceMultiplierStored;
		}

		// console.log('rewards[addr]', userPreviousVariables.rewards, account);
		// console.log('lp[addr]', userPreviousVariables.balanceLP);
		// console.log('bp[addr]', userPreviousVariables.balanceBP);
		// console.log('st[addr]', userPreviousVariables.balanceST);

		// console.log('lp total', totalSupplyLP);
		// console.log('bp total', totalSupplyBP);
		// console.log('st total', totalSupplyST);

		// console.log('balanceMultiplierStored', balanceMultiplierStored);
		// console.log('nativeMultiplierStored', nativeMultiplierStored);
		// console.log('tokenMultiplierStored', tokenMultiplierStored);
		// console.log('<------------END---updRewDEBUG---------->');

		userVariables[account] = userPreviousVariables;
		_;
	}

	function updateUserVariables(
		address account,
		UserVariables memory userPreviousVariables
	) internal view returns (UserVariables memory) {
		userPreviousVariables.rewards += tokenEarned(account);
		userPreviousVariables.balanceST =
			nativeEarned(account) -
			userPreviousVariables.balanceLP -
			userPreviousVariables.balanceBP;

		userPreviousVariables.userTokenMultiplierPaid = tokenMultiplierStored;
		userPreviousVariables.userNativeMultiplierPaid = nativeMultiplierStored;

		return userPreviousVariables;
	}

	function updateStoredVariables() internal {
		tokenMultiplierStored = getTokenMultiplier();
		nativeMultiplierStored = getNativeMultiplier();
		balanceMultiplierStored = getBalanceMultiplier();
	}

	function updateBonusPoints(
		address account,
		UserVariables memory userPreviousVariables
	) internal returns (UserVariables memory) {
		uint256 increaseOfBP = ((lastTimeRewardApplicable() -
			Math.min(userVariables[account].userLastUpdateTime, lastUpdateTime)) * userPreviousVariables.balanceLP) /
			ONE_YEAR_IN_SECS;

		totalSupplyBP += increaseOfBP;
		userPreviousVariables.balanceBP += increaseOfBP;

		return userPreviousVariables;
	}

	function updateVesting(
		address account,
		UserVariables memory userPreviousVariables
	) internal view returns (UserVariables memory) {
		if (
			Math.min(block.timestamp, userVariables[account].vestingFinishTime) <
			userVariables[account].userLastUpdateTime
		) {
			return userPreviousVariables;
		}

		uint256 increaseOfNC = ((Math.min(block.timestamp, userPreviousVariables.vestingFinishTime) -
			userPreviousVariables.userLastUpdateTime) *
			Math.min(userVariables[account].balanceVST, userPreviousVariables.balanceLP / VESTING_CONST)) /
			ONE_YEAR_IN_SECS;

		userPreviousVariables.balanceVST -= increaseOfNC;
		userPreviousVariables.balanceNC += increaseOfNC;

		return userPreviousVariables;
	}

	/* ========== EVENTS ========== */

	event TokenRewardAdded(uint256 reward);
	event NativeRewardAdded(uint256 reward);
	event Staked(address indexed user, uint256 amount);
	event Withdrawn(address indexed user, uint256 amount);
	event TokenRewardPaid(address indexed user, uint256 reward);
	event Vesting(address indexed user, uint256 reward);
}
