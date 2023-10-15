import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const bonusPointsEarned = function () {
	const yearInSeconds = BigInt(365 * 24 * 60 * 60)

	/* --- Units --- */

	it.skip('returns earned reward tokens from last update and stored rewards')

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
		let calculatedEarnedBonusPoints = stake * tokenRewardsDuration

		await staking.connect(signers[1]).compound()

		let earnedBonusPoints = (await staking.userVariables(signers[1].address)).balanceBP
		expect(earnedBonusPoints).to.be.eq(calculatedEarnedBonusPoints)
	})

	it('bonus points are not generated before notify', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* === Initialize rewards === */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		/* === Skip rewards distribution time === */

		await time.increase(tokenRewardsDuration)

		// 1 token
		const stake = await staking.balanceOf(signers[1].address)

		// 1 BP
		let calculatedEarnedBonusPoints = (stake * tokenRewardsDuration) / yearInSeconds

		let earnedBonusPoints = await staking.bonusPointsEarned(signers[1].address)
		expect(earnedBonusPoints).to.be.eq(calculatedEarnedBonusPoints)

		/* === Skip more time then rewards === */

		await time.increase(tokenRewardsDuration)

		// 1 BP
		calculatedEarnedBonusPoints = (stake * tokenRewardsDuration) / yearInSeconds

		earnedBonusPoints = await staking.bonusPointsEarned(signers[1].address)
		expect(earnedBonusPoints).to.be.eq(calculatedEarnedBonusPoints)
	})

	it('bonus points for stakers generate not more than totalBonusPoints calculation', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* === Initialize rewards === */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		/* === Skip rewards distribution time === */

		await time.increase(tokenRewardsDuration)

		const bonusPoints1 = await staking.bonusPointsEarned(signers[1].address)
		const bonusPoints2 = await staking.bonusPointsEarned(signers[2].address)
		const bonusPoints3 = await staking.bonusPointsEarned(signers[3].address)

		// const totalSupplyLP = await staking.totalSupplyLP()
		const totalBonusPoints = await staking.bonusPointsEarnedTotally()

		const sumOfBonusPoints = bonusPoints1 + bonusPoints2 + bonusPoints3

		expect(sumOfBonusPoints).to.be.eq(totalBonusPoints)
	})

	it('bonus points for stakers generate not more than totalBonusPoints calculation even after additional stakes', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* === Initialize rewards === */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		/* === Skip rewards distribution time === */

		await time.increase(tokenRewardsDuration / 2n)

		const stake1Initial = await staking.balanceOf(signers[1].address)
		const stake2Initial = await staking.balanceOf(signers[2].address)
		const stake3Initial = await staking.balanceOf(signers[3].address)

		const totalSupplyBefore = await staking.totalSupplyLP()

		const amount = BigInt(1e18)
		await staking.connect(signers[1]).stake(amount * 2n)
		await staking.connect(signers[2]).stake(amount * 5n)
		await staking.connect(signers[3]).stake(amount * 3n)

		const stake1End = await staking.balanceOf(signers[1].address)
		const stake2End = await staking.balanceOf(signers[2].address)
		const stake3End = await staking.balanceOf(signers[3].address)

		const totalSupplyAfter = await staking.totalSupplyLP()

		/* === Skip rewards distribution time === */

		await time.increase(tokenRewardsDuration / 2n)

		const bonusPoints1 = await staking.bonusPointsEarned(signers[1].address)
		const bonusPoints2 = await staking.bonusPointsEarned(signers[2].address)
		const bonusPoints3 = await staking.bonusPointsEarned(signers[3].address)

		/* === Checking total calculations in contract === */

		const totalBonusPoints = await staking.bonusPointsEarnedTotally()

		const sumOfBonusPoints = bonusPoints1 + bonusPoints2 + bonusPoints3

		expect(sumOfBonusPoints).to.be.within(totalBonusPoints - 1n, totalBonusPoints)

		/* === Checking calculations to be as planned === */

		const bonusPoints1Calculated = ((stake1Initial + stake1End) * tokenRewardsDuration) / 2n / yearInSeconds
		const bonusPoints2Calculated = ((stake2Initial + stake2End) * tokenRewardsDuration) / 2n / yearInSeconds
		const bonusPoints3Calculated = ((stake3Initial + stake3End) * tokenRewardsDuration) / 2n / yearInSeconds

		expect(bonusPoints1).to.be.approximately(bonusPoints1Calculated, 1e11)
		expect(bonusPoints2).to.be.approximately(bonusPoints2Calculated, 1e12)
		expect(bonusPoints3).to.be.approximately(bonusPoints3Calculated, 1e12)

		/* === Check total bonus points calculation === */

		const totalBonusPointsCalculated =
			((totalSupplyBefore + totalSupplyAfter) * tokenRewardsDuration) / 2n / yearInSeconds
		expect(totalBonusPoints).to.be.approximately(totalBonusPointsCalculated, 1e12)
	})

	it.skip('bonus points burned on withdraw proportionally to withdraw')
	it.skip('bonus points are increasing part of user rewards')

	/* --- Scenarios --- */
}
