import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'
import { expect } from 'chai'
import { any } from 'hardhat/internal/core/params/argumentTypes'
import hardhat from 'hardhat'

export const getNativeReward = function () {
	/* --- Units --- */
	const yearInSeconds = 365 * 24 * 60 * 60

	it('calls updateReward() with msg.sender as a parameter', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		await staking.connect(signers[1]).stake(BigInt(10e18))
		await staking.connect(signers[1]).vest(BigInt(1e18))

		await time.increase(tokenRewardsDuration / 3n)

		const getNativeReward = () => staking.getNativeReward()
		await expectUpdateRewardToBeCalled(getNativeReward, signers[1], staking, signers.slice(2, 4))
	})

	/* --- Requires --- */

	it('gets reward from balanceNC and sends to staker', async function () {
		hardhat.tracer.enabled = false
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		hardhat.tracer.enabled = true

		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })
		250000000000000000
		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const amount = BigInt(1e18)
		await staking.connect(signers[1]).stake(amount * 10n)
		await staking.connect(signers[1]).vest(amount)

		await time.increase(BigInt(yearInSeconds))

		let getNativeReward = staking.connect(signers[1]).getNativeReward()

		await expect(getNativeReward).to.changeEtherBalances([signers[1], staking], [amount, -amount])
	})

	it('sends native rewards according to unlock rate through the year', async function () {
		hardhat.tracer.enabled = false
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		hardhat.tracer.enabled = true

		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const amount = BigInt(1e18)
		await staking.connect(signers[1]).stake(amount * 10n)
		await staking.connect(signers[1]).vest(amount)

		const iterations = 6n

		for (let i = 1n; i <= iterations; i++) {
			const start = await time.latest()
			await time.increase(BigInt(yearInSeconds) / iterations - 1n)
			const end = await time.latest()

			const getNativeReward = staking.connect(signers[1]).getNativeReward()
			await expect(getNativeReward).to.changeEtherBalances(
				[signers[1], staking],
				[amount / iterations, -amount / iterations]
			)
		}
	})

	it('does nothing if there is not rewards for staker', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		hardhat.tracer.enabled = true

		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const amount = BigInt(1e18)
		await staking.connect(signers[1]).stake(amount * 10n)
		await staking.connect(signers[1]).vest(amount)

		await time.increase(BigInt(yearInSeconds))

		let getNativeReward = staking.connect(signers[4]).getNativeReward()

		await expect(getNativeReward).to.changeEtherBalances([signers[1], staking], [0, -0])
		await expect(getNativeReward).not.to.emit(staking, 'NativeRewardPaid')
	})

	it('makes balanceNC = 0', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })
		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const amount = BigInt(1e18)
		await staking.connect(signers[1]).stake(amount * 10n)
		await staking.connect(signers[1]).vest(amount)

		await time.increase(BigInt(yearInSeconds))

		const getNativeReward = staking.connect(signers[1]).getNativeReward()

		await expect(getNativeReward).to.changeEtherBalances([signers[1], staking], [amount, -amount])

		const repeatedGetNativeReward = staking.connect(signers[1]).getNativeReward()

		await expect(repeatedGetNativeReward).to.changeEtherBalances([signers[1], staking], [0, 0])

		const vars = await staking.userVariables(signers[1].address)
		expect(vars.balanceNC).to.be.eq(0)
	})

	it('emits NativeRewardPaid event', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })
		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const amount = BigInt(1e18)
		await staking.connect(signers[1]).stake(amount * 10n)
		await staking.connect(signers[1]).vest(amount)

		await time.increase(BigInt(yearInSeconds))

		const getNativeReward = staking.connect(signers[1]).getNativeReward()

		expect(getNativeReward).to.emit(staking, 'NativeRewardPaid').withArgs(signers[1].address, amount)
	})
}
