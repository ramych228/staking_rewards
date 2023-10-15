import { expect } from 'chai'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ContractTransactionResponse } from 'ethers'
import { Staking } from '../../typechain-types'

export async function expectUpdateRewardToBeCalled(
	func: () => Promise<ContractTransactionResponse>,
	sender: any,
	staking: Staking,
	signers: any[]
) {
	/* --- Get variables for later check that it have been modified --- */

	const rewardPerTokenStored = await staking.rewardPerTokenStored()
	const lastUpdateTime = await staking.lastUpdateTime()

	/* --- Transaction execution --- */

	await func()

	/* --- Get state variables after call --- */

	const rewardPerTokenStoredAfterCall = await staking.rewardPerTokenStored()
	const lastUpdateTimeAfterCall = await staking.lastUpdateTime()
	const userRewardPerTokenPaidAfterCall = await staking.userRewardPerTokenPaid(sender.address)

	/* --- Check that all variables from updateReward() are updated --- */

	// rewardPerTokenStored updated
	if (rewardPerTokenStored !== 0n) {
		expect(rewardPerTokenStoredAfterCall, 'rewardPerTokenStored didn`t change').not.to.be.eq(rewardPerTokenStored)
	}
	expect(rewardPerTokenStoredAfterCall, 'rewardPerTokenStored is not equals').to.be.eq(await staking.rewardPerToken())

	// lastUpdateTime updated
	expect(lastUpdateTimeAfterCall, 'lastUpdateTime must be changed to later time').to.be.greaterThan(lastUpdateTime)

	// rewards - can't check rewards updating because it's modified (makes 0) later in function

	// userRewardPerTokenPaid updated
	expect(userRewardPerTokenPaidAfterCall).to.be.eq(await staking.rewardPerToken())

	/* --- Check that different staker data is not modified --- */
	for (const signer of signers) {
		expect(await staking.rewards(signer.address)).to.be.eq(0)
		expect(await staking.userRewardPerTokenPaid(signer.address)).to.be.eq(0)
	}
}

// expectUpdateRewardToBeCalled() usage example
export const updateReward = function () {
	it('calls updateReward() modifier with msg.sender as argument', async function () {
		const { signers, staking, stakingToken, rewardToken } = await getStakingContractsWithStakersAndRewards()

		/* --- Setup rewards --- */

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		await time.increase(tokenRewardsDuration)

		/* --- Function call --- */

		const getReward = () => staking.connect(signers[1]).getReward()
		await expectUpdateRewardToBeCalled(getReward, signers[1], staking, signers.slice(2, 4))
	})
}
