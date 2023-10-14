import { mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const lastTimeRewardApplicable = function () {
	it('returns minimal of block.timestamp and periodFinish', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* --- Before rewards distribution initiation --- */
		expect(await staking.lastTimeRewardApplicable()).to.be.eq(0)

		/* --- After rewards distribution initiation --- */

		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewardsAmount)

		let latestBlockTimestamp = await time.latest()

		expect(await staking.lastTimeRewardApplicable()).to.be.eq(latestBlockTimestamp)

		/* --- In process of rewards distribution --- */

		await time.increaseTo(BigInt(latestBlockTimestamp) + (await staking.rewardsDuration()) / 2n)
		latestBlockTimestamp = await time.latest()
		expect(await staking.lastTimeRewardApplicable()).to.be.eq(latestBlockTimestamp)

		/* --- Just before the end of rewards distribution --- */

		await time.increaseTo(BigInt(latestBlockTimestamp) + (await staking.rewardsDuration()) / 2n - 1n)
		latestBlockTimestamp = await time.latest()
		expect(await staking.lastTimeRewardApplicable()).to.be.eq(latestBlockTimestamp)

		/* --- After end of rewards distribution --- */

		await time.increaseTo(BigInt(latestBlockTimestamp) + 2n)
		latestBlockTimestamp = await time.latest()
		const periodFinish = await staking.periodFinish()
		expect(await staking.lastTimeRewardApplicable()).to.be.eq(periodFinish)

		/* --- Long after end of rewards distribution --- */

		await time.increaseTo(BigInt(latestBlockTimestamp) + 1000000n)
		latestBlockTimestamp = await time.latest()
		expect(await staking.lastTimeRewardApplicable()).to.be.eq(periodFinish)
	})
}
