import { getStakingContracts, getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const getRewardForDuration = function () {
	/* --- Units --- */
	it('returns tokenRewardRate multiplied on rewardDuration', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		const tokenRewardRate = await staking.tokenRewardRate()
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		const rewardsForDuration = await staking.getRewardForDuration()

		expect(rewardsForDuration).to.be.eq(tokenRewardRate * tokenRewardsDuration)
	})

	/* --- Scenarios --- */

	it('returns 0 before rewards were initialized', async function () {
		const { staking } = await getStakingContracts()

		const tokenRewardRate = await staking.tokenRewardRate()

		expect(tokenRewardRate).to.be.eq(0)

		const rewardsForDuration = await staking.getRewardForDuration()

		expect(rewardsForDuration).to.be.eq(0)
	})
}
