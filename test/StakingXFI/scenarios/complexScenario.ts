import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractsWithStakersAndRewards } from '../_.fixtures'
import { expect } from 'chai'

export const complexScenario = async function () {
	const yearInSeconds = BigInt(365 * 24 * 60 * 60)

	const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

	const rewards = await rewardToken.balanceOf(await staking.getAddress())
	const tokenRewardsDuration = await staking.tokenRewardsDuration()

	await staking.notifyTokenRewardAmount(rewards)

	/* --- 1/3 of rewards duration --- */

	let stakeAmount1Staker = BigInt(1e18)
	let stakeAmount2Staker = BigInt(2e18)
	let stakeAmount3Staker = BigInt(3e18)

	await time.increase(tokenRewardsDuration / 3n)

	let BP1 = await staking.bonusPointsEarned(signers[1].address)
	let BP2 = await staking.bonusPointsEarned(signers[2].address)
	let BP3 = await staking.bonusPointsEarned(signers[3].address)

	expect(BP1 + BP2 + BP3).to.be.approximately(BigInt(2e18), 1)

	/* --- 2/3 of rewards duration --- */

	/*
	let stakeAmount1Staker = 2
	let stakeAmount2Staker = 1
	let stakeAmount3Staker = 5
	*/

	await staking.connect(signers[1]).stake(ethers.parseEther('1'))
	await staking.connect(signers[2]).withdraw(ethers.parseEther('1'))
	await staking.connect(signers[3]).stake(ethers.parseEther('2'))

	BP1 = await staking.bonusPointsCollected(signers[1].address)
	BP2 = await staking.bonusPointsCollected(signers[2].address)
	BP3 = await staking.bonusPointsCollected(signers[3].address)

	// Check BP collected for every staker
	// expect(BP1).to.be.eq((stakeAmount1Staker * tokenRewardsDuration) / 3n / yearInSeconds)
	// expect(BP2).to.be.eq((stakeAmount2Staker * tokenRewardsDuration) / 3n / yearInSeconds)
	// expect(BP3).to.be.eq((stakeAmount3Staker * tokenRewardsDuration) / 3n / yearInSeconds)

	const totalBonusPoints = await staking.totalBonusPoints()
	const totalSupplyOnFirstThird = stakeAmount1Staker + stakeAmount2Staker + stakeAmount3Staker
	const burnedBPOf2Staker = (stakeAmount2Staker * tokenRewardsDuration) / 3n / yearInSeconds / 2n

	// Error
	expect(BP1 + BP2 + BP3).to.be.eq(totalBonusPoints)
	// expect(BP1 + BP2 + BP3).to.be.eq(1666667047184170471n)

	await time.increase(tokenRewardsDuration / 3n)

	/* --- 3/3 of rewards duration --- */

	/*
		let stakeAmount1Staker = 3
		let stakeAmount2Staker = 4
		let stakeAmount3Staker = 3
		*/

	await staking.connect(signers[1]).stake(ethers.parseEther('1'))
	await staking.connect(signers[2]).stake(ethers.parseEther('3'))
	await staking.connect(signers[3]).withdraw(ethers.parseEther('2'))

	await time.increase(tokenRewardsDuration / 3n)

	/* --- Rewards finished - assert state --- */

	const tokenPeriodFinish = await staking.tokenPeriodFinish()
	expect(await time.latest()).to.be.greaterThanOrEqual(tokenPeriodFinish)

	const fairRewardFor1Staker =
		(BigInt(100e18) * 1n) / 6n / 3n + (BigInt(100e18) * 2n) / 8n / 3n + (BigInt(100e18) * 3n) / 10n / 3n

	const fairRewardFor2Staker =
		(BigInt(100e18) * 2n) / 6n / 3n + (BigInt(100e18) * 1n) / 8n / 3n + (BigInt(100e18) * 4n) / 10n / 3n

	const fairRewardFor3Staker =
		(BigInt(100e18) * 3n) / 6n / 3n + (BigInt(100e18) * 5n) / 8n / 3n + (BigInt(100e18) * 3n) / 10n / 3n

	// console.log('Fair Reward For 1 Staker', fairRewardFor1Staker)
	// console.log('Fair Reward For 2 Staker', fairRewardFor2Staker)
	// console.log('Fair Reward For 3 Staker', fairRewardFor3Staker)

	const reward1 = await staking.connect(signers[1]).tokenEarned(signers[1].address)
	const reward2 = await staking.connect(signers[2]).tokenEarned(signers[2].address)
	const reward3 = await staking.connect(signers[3]).tokenEarned(signers[3].address)

	console.log('Total reward', reward1 + reward2 + reward3)

	await staking.connect(signers[1]).getReward()
	await staking.connect(signers[2]).getReward()
	await staking.connect(signers[3]).getReward()

	const reward1Staker = await rewardToken.balanceOf(signers[1].address)
	const reward2Staker = await rewardToken.balanceOf(signers[2].address)
	const reward3Staker = await rewardToken.balanceOf(signers[3].address)

	expect(reward1Staker + reward2Staker + reward3Staker).to.be.lessThanOrEqual(rewards)

	// console.log('Actual Reward For 1 Staker', reward1Staker)
	// console.log('Actual Reward For 2 Staker', reward2Staker)
	// console.log('Actual Reward For 3 Staker', reward3Staker)

	// Precision of reward calculation in contract is about 0.0001%

	// const precision = 1000000n

	// expect(reward1Staker).to.be.within(
	// 	fairRewardFor1Staker - fairRewardFor1Staker / precision,
	// 	fairRewardFor1Staker + fairRewardFor1Staker / precision
	// )

	// expect(reward2Staker).to.be.within(
	// 	fairRewardFor2Staker - fairRewardFor2Staker / precision,
	// 	fairRewardFor2Staker + fairRewardFor2Staker / precision
	// )

	// expect(reward3Staker).to.be.within(
	// 	fairRewardFor3Staker - fairRewardFor3Staker / precision,
	// 	fairRewardFor3Staker + fairRewardFor3Staker / precision
	// )

	/*
	Notes on distribution calculation
	100000000000000000000 - rewards that meant to be distributed
	99999999999999359968  - actually distributed rewards
	640032 wei of rewardToken left undistributed due to calculation errors
	Better to have calculation error and rounding up that decrease rewards for users
	to be sure that's rewards on contract will be enough to distribute to all users
	*/
	const rewardBalanceOfContract = await rewardToken.balanceOf(await staking.getAddress())
	expect(rewardBalanceOfContract).to.be.lessThanOrEqual(BigInt(1e8))

	// Extremely precise for that amount of calculations with division
	expect(reward1Staker + reward2Staker + reward3Staker).to.be.within(99999999999000000000n, BigInt(100e18))
}
