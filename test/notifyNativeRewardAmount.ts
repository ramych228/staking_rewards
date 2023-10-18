import { expect } from 'chai'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'

export const notifyNativeRewardAmount = function () {
	/* --- Units --- */

	it('onlyOwner', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = BigInt(100e18)
		const notifyOfRandomUser = staking.connect(signers[1]).notifyNativeRewardAmount(rewards, { value: rewards })

		await expect(notifyOfRandomUser).to.be.revertedWith('Ownable: caller is not the owner')

		const notifyOfOwner = staking.notifyNativeRewardAmount(rewards, { value: rewards })

		await expect(notifyOfOwner).not.to.be.reverted
	})

	// There is a question about reentering actually
	// looks kinda sus
	it('calls updateReward() with address(0) as a parameter', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = BigInt(100e18)

		const notify = () => staking.notifyNativeRewardAmount(rewards, { value: rewards })

		await expectUpdateRewardToBeCalled(notify, signers[0], staking, signers.slice(1, 4))
	})

	describe('time condition', function () {
		it('doesn`t add leftovers if rewards distribution finished', async function () {
			const { staking, signers } = await getStakingContractsWithStakersAndRewards()
			const rewards = BigInt(100e18)

			const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()
			await staking.notifyNativeRewardAmount(rewards, { value: rewards })

			const nativeRewardsDuration = await staking.nativeRewardsDuration()
			await time.increase(nativeRewardsDuration * 2n)

			for (const staker of signers.slice(1, 4)) {
				await staking.connect(staker).getReward()
			}

			const leftovers = rewards - (await staking.totalSupplyST())

			let nativeRewardRate = await staking.nativeRewardRate()

			// totalSupplyST is nativeRewardRate more than initialized rewards
			const totalSupplyST = await staking.totalSupplyST()
			const calculationError = BigInt(1e7)

			expect(totalSupplyST).to.be.within(rewards - calculationError, rewards)
			expect(leftovers).to.be.lessThanOrEqual(calculationError)

			const amount = BigInt(1e18)
			await staking.notifyNativeRewardAmount(amount, { value: amount })

			nativeRewardRate = await staking.nativeRewardRate()

			const calculatedNativeRewardRate = (amount * AMOUNT_MULTIPLIER) / nativeRewardsDuration

			expect(nativeRewardRate).to.be.eq(calculatedNativeRewardRate)
		})

		it('adds leftovers and correctly calculates rate if rewards distribution have NOT finished', async function () {
			const { staking, signers } = await getStakingContractsWithStakersAndRewards()
			const rewards = BigInt(100e18)

			const nativeRewardsDuration = await staking.nativeRewardsDuration()

			await staking.notifyNativeRewardAmount(rewards / 2n, { value: rewards })

			await time.increase(nativeRewardsDuration / 2n - 1n)

			const nativePeriodFinish = await staking.nativePeriodFinish()
			const oldRewardRate = await staking.nativeRewardRate()

			await staking.notifyNativeRewardAmount(rewards / 2n)

			const latest = await time.latest()

			// 25e18 (half) is not distributed from initialized 50e18
			const leftovers = (nativePeriodFinish - BigInt(latest)) * oldRewardRate

			const nativeRewardRate = await staking.nativeRewardRate()

			const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()
			const calculatedNativeRewardRate = ((rewards / 2n) * AMOUNT_MULTIPLIER + leftovers) / nativeRewardsDuration

			expect(nativeRewardRate).to.be.approximately(calculatedNativeRewardRate, 1e11)
		})
	})

	it('reverts on initializing more rewards, than there is on contract', async function () {
		const { staking } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)

		let notify = staking.notifyNativeRewardAmount(rewards * 2n, { value: rewards })

		await expect(notify).to.be.revertedWith('Provided reward too high')

		notify = staking.notifyNativeRewardAmount(rewards + BigInt(1000000e18))

		await expect(notify).to.be.revertedWith('Provided reward too high')
	})

	it('updates lastUpdateTime to current timestamp', async function () {
		const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)

		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const latestTimestamp = await time.latest()
		expect(await staking.lastNativeUpdateTime()).to.be.eq(latestTimestamp)
	})

	it('updates nativePeriodFinish to current timestamp + nativeRewardsDuration', async function () {
		const { staking } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)

		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const latestTimestamp = await time.latest()
		const nativeRewardsDuration = await staking.nativeRewardsDuration()
		expect(await staking.nativePeriodFinish()).to.be.eq(BigInt(latestTimestamp) + nativeRewardsDuration)
	})

	it('emits RewardAdded(uint256 reward) event', async function () {
		const { staking } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)

		const notify = staking.notifyNativeRewardAmount(rewards, { value: rewards })

		await expect(notify).to.emit(staking, 'NativeRewardAdded').withArgs(rewards)
	})

	/* --- Scenarios --- */

	it('can initialize less rewards then there is on contract', async function () {
		const { staking } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)

		await staking.notifyNativeRewardAmount(rewards / 2n, { value: rewards })

		const nativeRewardRate = await staking.nativeRewardRate()
		const nativeRewardsDuration = await staking.nativeRewardsDuration()

		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()
		const calculatedNativeRewardRate = (rewards * AMOUNT_MULTIPLIER) / 2n / nativeRewardsDuration

		expect(nativeRewardRate).to.be.eq(calculatedNativeRewardRate)
	})

	it('rewards can be initialized in process of rewards distribution', async function () {
		const { staking } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)

		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

		const nativeRewardsDuration = await staking.nativeRewardsDuration()

		await staking.notifyNativeRewardAmount(rewards / 2n, { value: rewards })

		await time.increase(nativeRewardsDuration / 2n - 1n)

		const tx = staking.notifyNativeRewardAmount(rewards / 2n)

		await expect(tx).not.to.be.reverted

		const nativeRewardRate = await staking.nativeRewardRate()
		const calculatedNativeRewardRate = (rewards * AMOUNT_MULTIPLIER * 3n) / 4n / nativeRewardsDuration

		expect(nativeRewardRate).to.be.approximately(calculatedNativeRewardRate, 1e11)

		const latestTimestamp = await time.latest()
		const nativePeriodFinish = await staking.nativePeriodFinish()
		expect(nativePeriodFinish).to.be.eq(BigInt(latestTimestamp) + nativeRewardsDuration)
	})

	it('rewards can be reinitialized after distribution ends', async function () {
		const { staking } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)

		const nativeRewardsDuration = await staking.nativeRewardsDuration()

		await staking.notifyNativeRewardAmount(rewards / 2n, { value: rewards })

		await time.increase(nativeRewardsDuration)

		const tx = staking.notifyNativeRewardAmount(rewards / 2n)

		await expect(tx).not.to.be.reverted

		const nativeRewardRate = await staking.nativeRewardRate()
		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()
		const calculatedNativeRewardRate = (rewards * AMOUNT_MULTIPLIER) / 2n / nativeRewardsDuration

		expect(nativeRewardRate).to.be.approximately(calculatedNativeRewardRate, 1e7)

		const latestTimestamp = await time.latest()
		const nativePeriodFinish = await staking.nativePeriodFinish()
		expect(nativePeriodFinish).to.be.eq(BigInt(latestTimestamp) + nativeRewardsDuration)
	})

	it('rewards are not added to users if it wasn`t initialized', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		for (const staker of signers.slice(1, 4)) {
			const vars = await staking.userVariables(staker.address)
			expect(vars.rewards).to.be.eq(0)
		}

		const nativeRewardsDuration = await staking.nativeRewardsDuration()
		await time.increase(nativeRewardsDuration)

		for (const staker of signers.slice(1, 4)) {
			const vars = await staking.userVariables(staker.address)
			expect(vars.rewards).to.be.eq(0)
		}
	})
}
