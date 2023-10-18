import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'

export const exit = function () {
	/* --- Units --- */

	// There is a question about reentering actually
	// looks kinda sus

	it('calls updateReward() with msg.sender as a parameter', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const exit = () => staking.connect(signers[2]).exit()
		await expectUpdateRewardToBeCalled(exit, signers[2], staking, [signers[1], signers[3]])
	})

	it('calls withdraw()', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		for (const signer of signers.slice(1, 4)) {
			const userBalance = await staking.balanceLPOf(signer.address)
			const totalSupplyBefore = await staking.totalSupplyLP()

			const exit = staking.connect(signer).exit()

			await expect(exit).to.changeTokenBalances(stakingToken, [signer, staking], [userBalance, -userBalance])
			await expect(exit).to.emit(staking, 'Withdrawn').withArgs(signer.address, userBalance)

			const totalSupplyAfter = await staking.totalSupplyLP()

			expect(totalSupplyAfter).to.be.eq(
				totalSupplyBefore - userBalance,
				'Total supply decreased after withdraw from ' + signer.address
			)
		}
	})

	it('calls getReward()', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()
		/* --- Setup rewards --- */
		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		/* --- Function call --- */

		const oldBalanceOfStaking = await rewardToken.balanceOf(await staking.getAddress())

		await staking.connect(signers[1]).exit()

		/* --- Assert --- */
		const newBalanceOfStaking = await rewardToken.balanceOf(await staking.getAddress())
		const userBalance = await rewardToken.balanceOf(signers[1])

		expect(userBalance).to.be.eq(oldBalanceOfStaking - newBalanceOfStaking)

		const vars = await staking.userVariables(signers[1].address)
		const rewardsForUserAfterGetReward = vars.rewards
		expect(rewardsForUserAfterGetReward).to.be.eq(0)
	})

	/* --- Scenarios --- */

	it('reverts on being called without stake', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const exit = staking.connect(signers[4]).exit()

		await expect(exit).to.be.revertedWith('Cannot withdraw 0')
	})
}
