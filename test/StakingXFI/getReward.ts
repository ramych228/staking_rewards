import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { expectUpdateRewardToBeCalled } from './updateReward'

export const getReward = function () {
	/* --- Units --- */

	it.skip('non-reentrant')

	it('calls updateReward() modifier with msg.sender as argument', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* --- Setup rewards --- */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		/* --- Function call --- */

		const call = () => staking.connect(signers[1]).getReward()

		/* --- Assert --- */

		await expectUpdateRewardToBeCalled(call, signers[1], staking, signers.slice(2, 4))
	})

	it('returns no rewards if there is none for user', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		const tx = staking.connect(signers[9]).getReward()
		await expect(tx).not.to.emit(staking, 'RewardPaid')

		expect(await staking.tokenEarned(signers[9].address)).to.be.eq(0)
		expect(await rewardToken.balanceOf(signers[9].address)).to.be.eq(0)
	})

	it('makes rewards = 0', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		// Called to update 'rewards' mapping
		await staking.connect(signers[1]).getReward()

		const rewardsForUserAfterGetReward = await staking.rewards(signers[1].address)
		expect(rewardsForUserAfterGetReward).to.be.eq(0)
	})

	it('makes transfer', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)
		await time.increase(tokenRewardsDuration)

		const tokenEarned = await staking.tokenEarned(signers[1].address)

		const tx = staking.connect(signers[1]).getReward()

		await expect(tx).to.changeTokenBalances(rewardToken, [signers[1], staking], [tokenEarned, -tokenEarned])
	})

	it('emits event RewardPaid', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)
		await time.increase(tokenRewardsDuration)

		const tokenEarned = await staking.tokenEarned(signers[1].address)

		const tx = staking.connect(signers[1]).getReward()
		await expect(tx).to.emit(staking, 'RewardPaid').withArgs(signers[1].address, tokenEarned)
	})

	/* --- Scenarios --- */

	it('double withdraw of rewards will not get user more than he should get', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		// Called to update 'rewards' mapping
		await staking.connect(signers[1]).getReward()
		const balanceBefore = await rewardToken.balanceOf(signers[1].address)
		// await staking.connect(signers[1]).getReward()

		// Rewards must be already updated, so tokenEarned() must return 0
		await staking.connect(signers[1]).getReward()
		const balanceAfter = await rewardToken.balanceOf(signers[1].address)

		expect(balanceBefore).to.be.eq(balanceAfter)

		// expect(await rewardToken.balanceOf(signers[9].address)).to.be.eq(0)
	})

	it('being called right after stake returns no or almost no rewards (depends on time passed)', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		// Called to update 'rewards' mapping
		await staking.connect(signers[1]).getReward()
		const balanceBefore = await rewardToken.balanceOf(signers[1].address)
		// await staking.connect(signers[1]).getReward()

		// Rewards must be already updated, so tokenEarned() must return 0
		await staking.connect(signers[1]).getReward()
		const balanceAfter = await rewardToken.balanceOf(signers[1].address)

		expect(balanceBefore).to.be.eq(balanceAfter)

		// expect(await rewardToken.balanceOf(signers[9].address)).to.be.eq(0)
	})

	it('after all reward has been claimed contract should be empty', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		// Called to collect all reward tokens
		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[2]).getReward()
		await staking.connect(signers[3]).getReward()

		const balance = await rewardToken.balanceOf(await staking.getAddress())

		expect(balance).to.be.approximately(0, 1e8)

		// expect(await rewardToken.balanceOf(signers[9].address)).to.be.eq(0)
	})
}
