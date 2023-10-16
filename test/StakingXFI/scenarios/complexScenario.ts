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

	let stakeAmount1Staker1Period = BigInt(1e18)
	let stakeAmount2Staker1Period = BigInt(2e18)
	let stakeAmount3Staker1Period = BigInt(3e18)

	const totalShares1Period = (await staking.totalSupplyLP()) / AMOUNT_MULTIPLIER

	let staker1Shares1Period = await staking.balanceLPOf(signers[1].address)
	let staker2Shares1Period = await staking.balanceLPOf(signers[2].address)
	let staker3Shares1Period = await staking.balanceLPOf(signers[3].address)

	console.log(staker1Shares1Period)
	console.log(totalShares1Period)

	await time.increase(tokenRewardsDuration / 3n)

	await staking.connect(signers[1]).getReward()
	await staking.connect(signers[2]).getReward()
	await staking.connect(signers[3]).getReward()

	const staker1Reward1Period = await rewardToken.balanceOf(signers[1].address)
	const staker2Reward1Period = await rewardToken.balanceOf(signers[1].address)
	const staker3Reward1Period = await rewardToken.balanceOf(signers[1].address)

	const staker1RewardCalculated = (staker1Shares1Period * rewards) / totalShares1Period / 3n
	const staker2RewardCalculated = (staker2Shares1Period * rewards) / totalShares1Period / 3n
	const staker3RewardCalculated = (staker3Shares1Period * rewards) / totalShares1Period / 3n

	// expect(staker1Reward1Period).to.be.eq(staker1RewardCalculated)
	// expect(staker2Reward1Period).to.be.eq(staker2RewardCalculated)
	// expect(staker3Reward1Period).to.be.eq(staker3RewardCalculated)

	const totalRewardsDistributed = staker1Reward1Period + staker2Reward1Period + staker3Reward1Period
	const totalRewardDistributed1Period = rewards / 3n
	expect(totalRewardsDistributed).to.be.lessThanOrEqual(totalRewardDistributed1Period)

	/* --- 2/3 of rewards duration --- */

	let stakeAmount1Staker2Period = BigInt(2e18)
	let stakeAmount2Staker2Period = BigInt(1e18)
	let stakeAmount3Staker2Period = BigInt(5e18)

	await staking.connect(signers[1]).stake(BigInt(1e18))
	await staking.connect(signers[2]).withdraw(BigInt(1e18))
	await staking.connect(signers[3]).stake(BigInt(2e18))

	let staker1Shares2Period =
		(await staking.balanceLPOf(signers[1].address)) + (await staking.balanceBPOf(signers[1].address))
	let staker2Shares2Period =
		(await staking.balanceLPOf(signers[2].address)) + (await staking.balanceBPOf(signers[2].address))
	let staker3Shares2Period =
		(await staking.balanceLPOf(signers[3].address)) + (await staking.balanceBPOf(signers[3].address))

	const totalSharesBP2Period = (await staking.totalSupplyLP()) + (await staking.totalSupplyBP())

	await time.increase(tokenRewardsDuration / 3n + 1n)

	/* --- 3/3 of rewards duration --- */

	let stakeAmount1Staker3Period = BigInt(3e18)
	let stakeAmount2Staker3Period = BigInt(4e18)
	let stakeAmount3Staker3Period = BigInt(3e18)

	await staking.connect(signers[1]).stake(BigInt(1e18))
	await staking.connect(signers[2]).stake(BigInt(3e18))
	await staking.connect(signers[3]).withdraw(BigInt(2e18))

	let staker1Shares3Period =
		(await staking.balanceLPOf(signers[1].address)) + (await staking.balanceBPOf(signers[1].address))
	let staker2Shares3Period =
		(await staking.balanceLPOf(signers[2].address)) + (await staking.balanceBPOf(signers[2].address))
	let staker3Shares3Period =
		(await staking.balanceLPOf(signers[3].address)) + (await staking.balanceBPOf(signers[3].address))

	const stakesSum3Period = stakeAmount1Staker3Period + stakeAmount2Staker3Period + stakeAmount3Staker3Period
	const totalSupplyBP3Period = (await staking.totalSupplyBP()) + (await staking.totalSupplyBP())
	const totalShares3Period = stakesSum3Period + totalSupplyBP3Period

	await time.increase(tokenRewardsDuration / 3n)

	/* === Distribution finished === */

	const tokenPeriodFinish = await staking.tokenPeriodFinish()
	const latestTime = await time.latest()
	expect(latestTime).to.be.greaterThanOrEqual(tokenPeriodFinish)

	/* === Check rewards amounts === */

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

	// Contract distributed almost all the rewards
	const error = BigInt(1e7)
	expect(rewardBalanceOfContract).to.be.lessThanOrEqual(error)

	// Contract have transferred all distributed rewards to stakers
	// Calculation error is ~1-2 wei
	expect(reward1Staker + reward2Staker + reward3Staker).to.be.within(rewards - error, rewards)

	/* ====== Check rewards fairness ====== */

	const reward1StakerExpected =
		(((BigInt(1e18) * staker1Shares1Period) / totalShares1Period +
			(BigInt(1e18) * staker1Shares2Period) / totalShares3Period +
			(BigInt(1e18) * staker1Shares3Period) / totalShares3Period) *
			rewards) /
		3n /
		BigInt(1e18)

	const reward2StakerExpected = 1
	const reward3StakerExpected = 1

	expect(reward1Staker).to.be.eq(reward1StakerExpected)
	expect(reward2Staker).to.be.eq(reward2StakerExpected)
	expect(reward3Staker).to.be.eq(reward3StakerExpected)

	/* === Check BP accrued  === */
	{
		const BP1 = await staking.balanceBPOf(signers[1].address)
		const BP2 = await staking.balanceBPOf(signers[2].address)
		const BP3 = await staking.balanceBPOf(signers[3].address)

		console.log(stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period)
		console.log(
			(stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period) * tokenRewardsDuration
		)

		console.log(
			((stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period) *
				tokenRewardsDuration) /
				3n /
				yearInSeconds
		)

		const BP1Expected =
			((stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period) *
				tokenRewardsDuration) /
			3n /
			yearInSeconds
		const BP2Expected =
			((stakeAmount2Staker2Period + stakeAmount2Staker3Period) * tokenRewardsDuration) / 3n / yearInSeconds
		const BP3Expected = (stakeAmount3Staker3Period * tokenRewardsDuration) / 3n / yearInSeconds

		const BPerror = 1e12
		expect(BP1).to.be.approximately(BP1Expected, BPerror)
		expect(BP2).to.be.approximately(BP2Expected, BPerror)
		expect(BP3).to.be.approximately(BP3Expected, BPerror)
	}
}
