import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hardhat, { ethers } from 'hardhat'
import { getStakingContractsWithStakersAndRewards } from '../_.fixtures'
import { expect } from 'chai'

export const complexScenario = async function () {
	const yearInSeconds = BigInt(365 * 24 * 60 * 60)

	// Disabled to ignore traces from fixture
	hardhat.tracer.enabled = false
	const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()
	hardhat.tracer.enabled = true

	const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

	const rewards = await rewardToken.balanceOf(await staking.getAddress())
	const tokenRewardsDuration = await staking.tokenRewardsDuration()

	await staking.notifyTokenRewardAmount(rewards)

	/* --- 1/3 of rewards duration --- */

	let stakeAmount1Staker = BigInt(1e18)
	let stakeAmount2Staker = BigInt(2e18)
	let stakeAmount3Staker = BigInt(3e18)

	await time.increase(tokenRewardsDuration / 3n)

	/* --- 2/3 of rewards duration --- */

	/*
	let stakeAmount1Staker = 2
	let stakeAmount2Staker = 1
	let stakeAmount3Staker = 5
	*/

	await staking.connect(signers[1]).stake(BigInt(1e18))
	await staking.connect(signers[1]).stake(BigInt(1e18))
	await staking.connect(signers[1]).stake(BigInt(1e18))
	// await staking.connect(signers[2]).withdraw(BigInt(1e18))
	// await staking.connect(signers[3]).stake(BigInt(2e18))

	await time.increase(tokenRewardsDuration / 3n + 1n)

	/* --- 3/3 of rewards duration --- */

	/*
		let stakeAmount1Staker = 3
		let stakeAmount2Staker = 4
		let stakeAmount3Staker = 3
		*/

	await staking.connect(signers[1]).stake(BigInt(1e18))
	// await staking.connect(signers[2]).stake(BigInt(3e18))
	// await staking.connect(signers[3]).withdraw(BigInt(2e18))

	await time.increase(tokenRewardsDuration / 3n + 1n)

	/* === Distribution finished === */

	// await time.increase(tokenRewardsDuration)

	const tokenPeriodFinish = await staking.tokenPeriodFinish()
	const latestTime = await time.latest()
	expect(latestTime).to.be.greaterThanOrEqual(tokenPeriodFinish)

	await staking.connect(signers[1]).getReward()
	await staking.connect(signers[2]).getReward()
	await staking.connect(signers[3]).getReward()

	const reward1Staker = await rewardToken.balanceOf(signers[1].address)
	const reward2Staker = await rewardToken.balanceOf(signers[2].address)
	const reward3Staker = await rewardToken.balanceOf(signers[3].address)

	expect(reward1Staker + reward2Staker + reward3Staker).to.be.lessThanOrEqual(rewards)

	console.log('Actual Reward For 1 Staker', reward1Staker)
	console.log('Actual Reward For 2 Staker', reward2Staker)
	console.log('Actual Reward For 3 Staker', reward3Staker)

	const rewardBalanceOfContract = await rewardToken.balanceOf(await staking.getAddress())
	expect(rewardBalanceOfContract).to.be.lessThanOrEqual(BigInt(1e8))

	// Extremely precise for that amount of calculations with division
	expect(reward1Staker + reward2Staker + reward3Staker).to.be.within(99999999999000000000n, BigInt(100e18))
}
