import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'

export const exit = function () {
	/* --- Units --- */

	// There is a question about reentering actually
	// looks kinda sus
	it.skip('non-reentrant')

	it('calls updateReward() with msg.sender as a parameter', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards)

		const rewardsDuration = await staking.rewardsDuration()
		await time.increase(rewardsDuration / 3n)

		const exit = () => staking.connect(signers[2]).exit()
		await expectUpdateRewardToBeCalled(exit, signers[2], staking, [signers[1], signers[3]])
	})

	it('calls withdraw()', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		for (const signer of signers.slice(1, 4)) {
			const userBalance = await staking.balanceOf(signer.address)
			const totalSupplyBefore = await staking.totalSupply()

			const exit = staking.connect(signer).exit()

			await expect(exit).to.changeTokenBalances(stakingToken, [signer, staking], [userBalance, -userBalance])
			await expect(exit).to.emit(staking, 'Withdrawn').withArgs(signer.address, userBalance)

			const totalSupplyAfter = await staking.totalSupply()

			expect(totalSupplyAfter).to.be.eq(
				totalSupplyBefore - userBalance,
				'Total supply decreased after withdraw from ' + signer.address
			)
		}
	})

	it('calls getReward()', async function () {
		const { signers, staking, stakingToken, rewardToken } = await getStakingContractsWithStakersAndRewards()
		/* --- Setup rewards --- */
		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const rewardsDuration = await staking.rewardsDuration()

		await staking.notifyRewardAmount(rewards)

		await time.increase(rewardsDuration)

		/* --- Function call --- */
		const earned = await staking.earned(signers[1].address)
		const exit = staking.connect(signers[1]).getReward()

		/* --- Assert --- */
		await expect(exit).to.changeTokenBalances(rewardToken, [signers[1], staking], [earned, -earned])
		await expect(exit).to.emit(staking, 'RewardPaid').withArgs(signers[1].address, earned)

		const rewardsForUserAfterGetReward = await staking.rewards(signers[1].address)
		expect(rewardsForUserAfterGetReward).to.be.eq(0)
	})

	/* --- Scenarios --- */

	it('reverts on being called without stake', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

		const exit = staking.connect(signers[4]).exit()

		await expect(exit).to.be.revertedWith('Cannot withdraw 0')
	})
}
