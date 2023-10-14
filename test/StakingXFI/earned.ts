import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const earned = function () {
	/* --- Units --- */

	it.skip('returns earned reward tokens from last update and stored rewards')

	/* --- Scenarios --- */

	it('calculates rewards for every staker according to their stake', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const rewardsDuration = await staking.rewardsDuration()

		await staking.notifyRewardAmount(rewards)

		await time.increase(rewardsDuration)

		const earned1 = await staking.earned(signers[1].address)
		const earned2 = await staking.earned(signers[2].address)
		const earned3 = await staking.earned(signers[3].address)

		const balance1 = await staking.balanceOf(signers[1].address)
		const balance2 = await staking.balanceOf(signers[2].address)
		const balance3 = await staking.balanceOf(signers[3].address)

		const totalSupply = await staking.totalSupply()

		expect(earned1).to.be.approximately((rewards * balance1) / totalSupply, 1e9)
		expect(earned2).to.be.approximately((rewards * balance2) / totalSupply, 1e9)
		expect(earned3).to.be.approximately((rewards * balance3) / totalSupply, 1e9)
	})

	it('calculates rewards for every staker according to their stake in situation with increasing stakes', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const rewardsDuration = await staking.rewardsDuration()

		await staking.notifyRewardAmount(rewards)

		await time.increase(rewardsDuration / 2n)

		const balance1Before = await staking.balanceOf(signers[1].address)
		const balance2Before = await staking.balanceOf(signers[2].address)
		const balance3Before = await staking.balanceOf(signers[3].address)

		const totalSupplyBefore = await staking.totalSupply()

		await staking.connect(signers[1]).stake(BigInt(2e18))
		await staking.connect(signers[2]).stake(BigInt(3e18))

		await time.increase(rewardsDuration / 2n)

		const earned1 = await staking.earned(signers[1].address)
		const earned2 = await staking.earned(signers[2].address)
		const earned3 = await staking.earned(signers[3].address)

		const balance1 = await staking.balanceOf(signers[1].address)
		const balance2 = await staking.balanceOf(signers[2].address)
		const balance3 = await staking.balanceOf(signers[3].address)

		const totalSupply = await staking.totalSupply()

		console.log(earned1 + earned2 + earned3)

		expect(earned1).to.be.approximately(
			(rewards * balance1Before) / 2n / totalSupplyBefore + (rewards * balance1) / 2n / totalSupply,
			1e13
		)
		expect(earned2).to.be.approximately(
			(rewards * balance2Before) / 2n / totalSupplyBefore + (rewards * balance2) / 2n / totalSupply,
			1e13
		)
		expect(earned3).to.be.approximately(
			(rewards * balance3Before) / 2n / totalSupplyBefore + (rewards * balance3) / 2n / totalSupply,
			1e13
		)
	})

	it('called after rewards finished returns same rewards as called at the end of distribution', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const rewardsDuration = await staking.rewardsDuration()

		await staking.notifyRewardAmount(rewards)

		await time.increase(rewardsDuration)

		const earnedAtTheEndOfDistribution = await staking.earned(signers[1].address)

		await time.increase(rewardsDuration * 2n)

		const earnedMuchLaterAfterFinish = await staking.earned(signers[1].address)

		expect(earnedMuchLaterAfterFinish).to.be.eq(earnedAtTheEndOfDistribution)
	})
}
