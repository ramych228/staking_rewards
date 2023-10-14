import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContracts, getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const bonusPointsEarnedTotally = function () {
	const yearInSeconds = BigInt(365 * 24 * 60 * 60)

	/* --- Units --- */

	it.skip('returns earned reward tokens from last update and stored rewards')

	it('bonus points rate is 100% APR for all stakers', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

		/* ========== Initialize rewards ========== */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		/* ========== Check initial Total Bonus Points ========== */

		let totalBonusPoints = await staking.totalBonusPoints()

		expect(totalBonusPoints).to.be.eq(0)

		/* ========== Total Bonus Points after time have passed ========== */

		await time.increase(yearInSeconds / 2n)

		// Updates rewards and bonus points
		await staking.connect(signers[1]).getReward()

		totalBonusPoints = await staking.bonusPointsEarnedTotally()

		const totalSupplyLP = await staking.totalSupplyLP()

		expect(totalBonusPoints).to.be.approximately(totalSupplyLP / 2n, 1e13)
	})

	it('no bonus points generated before notify', async function () {
		const { signers, staking, stakingToken } = await getStakingContracts()

		const amount = BigInt(100e18)
		await stakingToken.mint(signers[1].address, amount)
		await stakingToken.mint(signers[2].address, amount)
		await stakingToken.mint(signers[3].address, amount)

		await stakingToken.connect(signers[1]).approve(await staking.getAddress(), amount)
		await stakingToken.connect(signers[2]).approve(await staking.getAddress(), amount)
		await stakingToken.connect(signers[3]).approve(await staking.getAddress(), amount)

		expect(await staking.totalBonusPoints()).to.be.eq(0)

		await staking.connect(signers[1]).stake(BigInt(1e18))

		// After first stake totalBonusPoints are not changed
		// because of multiplication on totalSupplyLP = 0
		expect(await staking.totalBonusPoints()).to.be.eq(0n)

		// console.log('Last update time', await staking.lastUpdateTime())
		await staking.connect(signers[2]).stake(BigInt(1e18))

		await time.increase(1000)

		expect(await staking.totalBonusPoints()).to.be.eq(0)
	})

	it('no bonus points generated after periodFinish', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

		/* ========== Initialize rewards ========== */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		/* ========== Check initial Total Bonus Points ========== */

		let totalBonusPoints = await staking.totalBonusPoints()

		expect(totalBonusPoints).to.be.eq(0)

		/* ========== Total Bonus Points after time have passed ========== */

		await time.increase(yearInSeconds / 2n)

		// Updates rewards and bonus points
		await staking.connect(signers[1]).getReward()

		totalBonusPoints = await staking.bonusPointsEarnedTotally()

		const totalSupplyLP = await staking.totalSupplyLP()

		expect(totalBonusPoints).to.be.approximately(totalSupplyLP / 2n, 1e13)

		/* ========== Total Bonus Points after more time have passed ========== */

		await time.increase(yearInSeconds / 2n)

		let totalBonusPointsStored = await staking.totalBonusPoints()
		expect(totalBonusPointsStored).to.be.approximately(totalSupplyLP / 2n, 1e13)

		// Updates rewards and bonus points
		await staking.connect(signers[1]).getReward()

		totalBonusPointsStored = await staking.totalBonusPoints()
		expect(totalBonusPointsStored).to.be.approximately(totalSupplyLP, 1e13)

		totalBonusPoints = await staking.bonusPointsEarnedTotally()

		// Total bonus points remain the same
		expect(totalBonusPoints).to.be.approximately(totalSupplyLP, 1)
	})

	it.skip('bonus points are updated on updateReward()')

	it.skip('bonus points burned on withdraw proportionally to withdraw')
	it.skip('bonus points are increasing part of user rewards')

	/* --- Scenarios --- */
}
