import { expect } from 'chai'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'

export const notifyRewardAmount = function () {
	/* --- Units --- */

	it('onlyOwner', async function () {
		const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const notifyOfRandomUser = staking.connect(signers[1]).notifyRewardAmount(rewards)

		await expect(notifyOfRandomUser).to.be.revertedWith('Ownable: caller is not the owner')

		const notifyOfOwner = staking.notifyRewardAmount(rewards)

		await expect(notifyOfOwner).not.to.be.reverted
	})

	// There is a question about reentering actually
	// looks kinda sus
	it('calls updateReward() with address(0) as a parameter', async function () {
		const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const notify = () => staking.notifyRewardAmount(rewards)

		await expectUpdateRewardToBeCalled(notify, signers[0], staking, signers.slice(1, 4))
	})

	describe('time condition', function () {
		it('doesn`t add leftovers if rewards distribution finished', async function () {
			const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

			const rewards = await rewardToken.balanceOf(await staking.getAddress())
			await staking.notifyRewardAmount(rewards)

			const rewardsDuration = await staking.rewardsDuration()
			await time.increase(rewardsDuration * 2n)

			for (const staker of signers.slice(1, 4)) {
				await staking.connect(staker).getReward()
			}

			const leftovers = await rewardToken.balanceOf(await staking.getAddress())
			expect(leftovers).to.be.lessThanOrEqual(1e8)

			const amount = BigInt(1e18)
			await rewardToken.transfer(await staking.getAddress(), amount)
			await staking.notifyRewardAmount(amount)

			const rewardRate = await staking.rewardRate()
			expect(rewardRate).to.be.eq(amount / rewardsDuration)
		})

		it('adds leftovers and correctly calculates rate if rewards distribution have NOT finished', async function () {
			const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

			const rewards = await rewardToken.balanceOf(await staking.getAddress())

			const rewardsDuration = await staking.rewardsDuration()

			await staking.notifyRewardAmount(rewards / 2n)

			await time.increase(rewardsDuration / 2n)

			for (const staker of signers.slice(1, 4)) {
				await staking.connect(staker).getReward()
			}

			const latest = await time.latest()
			const periodFinish = await staking.periodFinish()
			const oldRewardRate = await staking.rewardRate()

			// 25e18 (half) is not distributed from initialized 50e18
			const leftovers = (periodFinish - BigInt(latest)) * oldRewardRate

			await staking.notifyRewardAmount(rewards / 2n)

			const rewardRate = await staking.rewardRate()

			expect(rewardRate).to.be.approximately((leftovers + rewards / 2n) / rewardsDuration, 1e7)
		})
	})

	it('reverts on initializing more rewards, than there is on contract', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		let notify = staking.notifyRewardAmount(rewards * 2n)

		await expect(notify).to.be.revertedWith('Provided reward too high')

		// ?????
		notify = staking.notifyRewardAmount(rewards + BigInt(1000000e18))

		await expect(notify).to.be.revertedWith('Provided reward too high')
	})

	it('updates lastUpdateTime to current timestamp', async function () {
		const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards)

		const latestTimestamp = await time.latest()
		expect(await staking.lastUpdateTime()).to.be.eq(latestTimestamp)
	})

	it('updates periodFinish to current timestamp + rewardsDuration', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards)

		const latestTimestamp = await time.latest()
		const rewardsDuration = await staking.rewardsDuration()
		expect(await staking.periodFinish()).to.be.eq(BigInt(latestTimestamp) + rewardsDuration)
	})

	it('emits RewardAdded(uint256 reward) event', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const notify = staking.notifyRewardAmount(rewards)

		await expect(notify).to.emit(staking, 'RewardAdded').withArgs(rewards)
	})

	/* --- Scenarios --- */

	it('can initialize less rewards then there is on contract', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards / 2n)

		const rewardRate = await staking.rewardRate()
		const rewardsDuration = await staking.rewardsDuration()
		expect(rewardRate).to.be.eq(rewards / 2n / rewardsDuration)
	})

	it('rewards can be initialized in process of rewards distribution', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const rewardsDuration = await staking.rewardsDuration()

		await staking.notifyRewardAmount(rewards / 2n)

		await time.increase(rewardsDuration / 2n)

		const tx = staking.notifyRewardAmount(rewards / 2n)

		await expect(tx).not.to.be.reverted

		const rewardRate = await staking.rewardRate()
		expect(rewardRate).to.be.approximately((rewards * 3n) / 4n / rewardsDuration, 1e7)

		const latestTimestamp = await time.latest()
		const periodFinish = await staking.periodFinish()
		expect(periodFinish).to.be.eq(BigInt(latestTimestamp) + rewardsDuration)
	})

	it('rewards can be reinitialized after distribution ends', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const rewardsDuration = await staking.rewardsDuration()

		await staking.notifyRewardAmount(rewards / 2n)

		await time.increase(rewardsDuration)

		const tx = staking.notifyRewardAmount(rewards / 2n)

		await expect(tx).not.to.be.reverted

		const rewardRate = await staking.rewardRate()
		expect(rewardRate).to.be.approximately(rewards / 2n / rewardsDuration, 1e7)

		const latestTimestamp = await time.latest()
		const periodFinish = await staking.periodFinish()
		expect(periodFinish).to.be.eq(BigInt(latestTimestamp) + rewardsDuration)
	})

	it('rewards are not added to users if it wasn`t initialized', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		for (const staker of signers.slice(1, 4)) {
			const earned = await staking.earned(staker.address)
			expect(earned).to.be.eq(0)
		}

		const rewardsDuration = await staking.rewardsDuration()
		await time.increase(rewardsDuration)

		for (const staker of signers.slice(1, 4)) {
			const earned = await staking.earned(staker.address)
			expect(earned).to.be.eq(0)
		}
	})
}
