// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

abstract contract RewardsDistributionRecipient {
    address public rewardsDistribution;

    function notifyTokenRewardAmount(uint256 reward) external virtual;

    function notifyNativeRewardAmount(uint256 reward) external virtual payable;

    modifier onlyRewardsDistribution() {
        require(msg.sender == rewardsDistribution, "Caller is not RewardsDistribution contract");
        _;
    }
}