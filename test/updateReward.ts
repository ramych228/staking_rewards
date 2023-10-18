import { expect } from 'chai'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ContractTransactionResponse } from 'ethers'
import { Staking } from '../typechain-types'

export async function expectUpdateRewardToBeCalled(
	func: () => Promise<ContractTransactionResponse>,
	sender: any,
	staking: Staking,
	signers: any[]
) {
	/* --- Get variables for later check that it have been modified --- */

	const tokenMultiplierStored = await staking.tokenMultiplierStored()
	const nativeMultiplierStored = await staking.nativeMultiplierStored()
	// const balanceMultiplierStored = await staking.balanceMultiplierStored()
	// const lastUpdateTime = await staking.lastUpdateTime()
	// const lastPoolUpdateTime = await staking.lastPoolUpdateTime()

	/* --- Transaction execution --- */

	await func()

	/* --- Get state variables after call --- */

	const tokenMultiplierStoredAfterCall = await staking.tokenMultiplierStored()
	const nativeMultiplierStoredAfterCall = await staking.nativeMultiplierStored()
	// const balanceMultiplierStoredAfterCall = await staking.balanceMultiplierStored()

	// const lastUpdateTimeAfterCall = await staking.lastUpdateTime()
	// const lastPoolUpdateTimeAfterCall = await staking.lastPoolUpdateTime()

	/* --- Check that all variables from updateReward() are updated --- */

	// tokenMultiplierStored updated
	if (tokenMultiplierStoredAfterCall === BigInt(1e30)) {
		expect(tokenMultiplierStored, 'rewardPerTokenStored didn`t change').not.to.be.eq(tokenMultiplierStoredAfterCall)
	}

	expect(tokenMultiplierStoredAfterCall, 'rewardPerTokenStored is not equals').to.be.eq(
		await staking.getTokenMultiplier()
	)

	// nativeMultiplierStored updated
	if (nativeMultiplierStoredAfterCall === BigInt(1e30)) {
		expect(nativeMultiplierStored, 'nativeMultiplierStored didn`t change').not.to.be.eq(
			nativeMultiplierStoredAfterCall
		)
	}

	expect(nativeMultiplierStoredAfterCall, 'nativeMultiplierStored equals').to.be.eq(
		await staking.getNativeMultiplier()
	)

	// balanceMultiplierStored updated
	// if (balanceMultiplierStoredAfterCall === BigInt(1e30)) {
	// 	expect(balanceMultiplierStored, 'balanceMultiplierStored didn`t change').not.to.be.eq(
	// 		balanceMultiplierStoredAfterCall
	// 	)
	// }

	// expect(balanceMultiplierStoredAfterCall, 'balanceMultiplierStored is equals').to.be.eq(
	// 	await staking.getBalanceMultiplier()
	// )

	// lastUpdateTime and lastPoolUpdateTime updated
	// expect(lastUpdateTimeAfterCall, 'lastUpdateTime should change').to.be.greaterThan(lastUpdateTime)

	// Updates only if account != address(0)
	// expect(lastPoolUpdateTimeAfterCall, 'lastUpdateTime should change').to.be.greaterThanOrEqual(lastPoolUpdateTime)
}

// expectUpdateRewardToBeCalled() usage example
export const updateReward = function () {
	it('calls updateReward() modifier with msg.sender as argument', async function () {
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

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
