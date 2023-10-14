import { getStakingContracts, getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const getRewardForDuration = function () {
	/* --- Units --- */
	it('returns rewardRate multiplied on rewardDuration', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards)

		const rewardRate = await staking.rewardRate()
		const rewardsDuration = await staking.rewardsDuration()

		const rewardsForDuration = await staking.getRewardForDuration()

		expect(rewardsForDuration).to.be.eq(rewardRate * rewardsDuration)
	})

	/* --- Scenarios --- */

	it('returns 0 before rewards were initialized', async function () {
		const { staking } = await getStakingContracts()

		const rewardRate = await staking.rewardRate()

		expect(rewardRate).to.be.eq(0)

		const rewardsForDuration = await staking.getRewardForDuration()

		expect(rewardsForDuration).to.be.eq(0)
	})
}
