import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const bonusPoints = function () {
	const yearInSeconds = BigInt(365 * 24 * 60 * 60)

	/* --- Units --- */

	it('bonus points rate is 100% APR', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* === Initialize rewards === */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		// 1 token
		const stake = await staking.balanceLPOf(signers[1].address)

		// 1 BP
		const bonusPointsRate = stake / yearInSeconds

		let calculatedEarnedBonusPoints = (stake * tokenRewardsDuration) / yearInSeconds

		await staking.connect(signers[1]).getReward()

		let earnedBonusPoints = await staking.balanceBPOf(signers[1].address)

		// 5 seconds elapsed additionally to tokenRewardsDuration
		expect(earnedBonusPoints).to.be.approximately(calculatedEarnedBonusPoints, bonusPointsRate * 5n)
	})

	it('bonus points are generated before notify', async function () {
		const { signers, staking } = await getStakingContractsWithStakersAndRewards()

		const stake = await staking.balanceLPOf(signers[1].address)

		await staking.connect(signers[1]).getReward()

		const bonusPointsRate = stake / yearInSeconds
		const balanceBP = await staking.balanceBPOf(signers[1].address)

		// 3 seconds elapsed after stake for 1 staker
		expect(balanceBP).to.be.approximately(bonusPointsRate * 3n, 2)
	})

	it('bonus points for stakers generate not more than totalBonusPoints calculation', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* === Initialize rewards === */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		/* === Skip rewards distribution time === */

		await time.increase(tokenRewardsDuration)

		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[2]).getReward()
		await staking.connect(signers[3]).getReward()

		const bonusPoints1 = await staking.balanceBPOf(signers[1].address)
		const bonusPoints2 = await staking.balanceBPOf(signers[2].address)
		const bonusPoints3 = await staking.balanceBPOf(signers[3].address)

		// const totalSupplyLP = await staking.totalSupplyLP()
		const totalBonusPoints = await staking.totalSupplyBP()

		const sumOfBonusPoints = bonusPoints1 + bonusPoints2 + bonusPoints3

		expect(sumOfBonusPoints).to.be.within(totalBonusPoints - 2n, totalBonusPoints)
	})

	it('bonus points for stakers generate not more than totalBonusPoints calculation even after additional stakes', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* === Initialize rewards === */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		/* === Skip rewards distribution time === */

		await time.increase(tokenRewardsDuration / 2n)

		const stake1Initial = await staking.balanceLPOf(signers[1].address)
		const stake2Initial = await staking.balanceLPOf(signers[2].address)
		const stake3Initial = await staking.balanceLPOf(signers[3].address)

		const totalSupplyBefore = await staking.totalSupplyLP()

		const amount = BigInt(1e18)
		await staking.connect(signers[1]).stake(amount * 2n)
		await staking.connect(signers[2]).stake(amount * 5n)
		await staking.connect(signers[3]).stake(amount * 3n)

		const stake1End = await staking.balanceLPOf(signers[1].address)
		const stake2End = await staking.balanceLPOf(signers[2].address)
		const stake3End = await staking.balanceLPOf(signers[3].address)

		const totalSupplyAfter = await staking.totalSupplyLP()

		/* === Skip rewards distribution time === */

		await time.increase(tokenRewardsDuration / 2n)

		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[2]).getReward()
		await staking.connect(signers[3]).getReward()

		const bonusPoints1 = await staking.balanceBPOf(signers[1].address)
		const bonusPoints2 = await staking.balanceBPOf(signers[2].address)
		const bonusPoints3 = await staking.balanceBPOf(signers[3].address)

		/* === Checking total calculations in contract === */

		const totalBonusPoints = await staking.totalSupplyBP()

		const sumOfBonusPoints = bonusPoints1 + bonusPoints2 + bonusPoints3

		expect(sumOfBonusPoints).to.be.within(totalBonusPoints - 2n, totalBonusPoints)

		/* === Checking calculations to be as planned === */

		const bonusPoints1Calculated = ((stake1Initial + stake1End) * tokenRewardsDuration) / 2n / yearInSeconds
		const bonusPoints2Calculated = ((stake2Initial + stake2End) * tokenRewardsDuration) / 2n / yearInSeconds
		const bonusPoints3Calculated = ((stake3Initial + stake3End) * tokenRewardsDuration) / 2n / yearInSeconds

		expect(bonusPoints1).to.be.approximately(bonusPoints1Calculated, 1e12)
		expect(bonusPoints2).to.be.approximately(bonusPoints2Calculated, 1e12)
		expect(bonusPoints3).to.be.approximately(bonusPoints3Calculated, 1e12)

		/* === Check total bonus points calculation === */

		const totalBonusPointsCalculated =
			((totalSupplyBefore + totalSupplyAfter) * tokenRewardsDuration) / 2n / yearInSeconds
		expect(totalBonusPoints).to.be.approximately(totalBonusPointsCalculated, 1e14)
	})

	it('bonus points burned on withdrawal', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* === Initialize rewards === */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.connect(signers[1]).getReward()

		await staking.connect(signers[1]).withdraw(1)

		const BP = await staking.balanceBPOf(signers[1].address)
		expect(BP).to.be.eq(0)

		/* === Initialize rewards === */

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[1]).withdraw(1)

		let earnedBonusPoints = await staking.balanceBPOf(signers[1].address)

		// 5 seconds elapsed additionally to tokenRewardsDuration
		expect(earnedBonusPoints).to.be.eq(0)
	})
}
