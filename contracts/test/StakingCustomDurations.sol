// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.19;

import '../Staking.sol';

/// @title Complicated staking contract
/// @author Monty C. Python
contract StakingCustomDuration is Staking {
	constructor(
		address _rewardsDistribution,
		address _rewardsToken,
		address _stakingToken,
		uint _nativeRewardsDuration,
		uint _tokenRewardsDuration
	) Staking(_rewardsDistribution, _rewardsToken, _stakingToken) {
		tokenRewardsDuration = _tokenRewardsDuration;
		nativeRewardsDuration = _nativeRewardsDuration;
	}
}
