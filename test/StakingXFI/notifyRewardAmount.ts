import { expect } from 'chai'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'

export const notifyTokenRewardAmount = function () {
	/* --- Units --- */

	it('onlyOwner', async function () {
		const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		const notifyOfRandomUser = staking.connect(signers[1]).notifyTokenRewardAmount(rewards)

		await expect(notifyOfRandomUser).to.be.revertedWith('Ownable: caller is not the owner')

		const notifyOfOwner = staking.notifyTokenRewardAmount(rewards)

		await expect(notifyOfOwner).not.to.be.reverted
	})

	// There is a question about reentering actually
	// looks kinda sus
	it('calls updateReward() with address(0) as a parameter', async function () {
		const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		const notify = () => staking.notifyTokenRewardAmount(rewards)

		await expectUpdateRewardToBeCalled(notify, signers[0], staking, signers.slice(1, 4))
	})

	describe('time condition', function () {
		it('doesn`t add leftovers if rewards distribution finished', async function () {
			const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

			const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
			await staking.notifyTokenRewardAmount(rewards)

			const tokenRewardsDuration = await staking.tokenRewardsDuration()
			await time.increase(tokenRewardsDuration * 2n)

			for (const staker of signers.slice(1, 4)) {
				await staking.connect(staker).getReward()
			}

			const leftovers = await rewardToken.balanceLPOf(await staking.getAddress())
			expect(leftovers).to.be.lessThanOrEqual(1e8)

			const amount = BigInt(1e18)
			await rewardToken.transfer(await staking.getAddress(), amount)
			await staking.notifyTokenRewardAmount(amount)

			const tokenRewardRate = await staking.tokenRewardRate()
			expect(tokenRewardRate).to.be.eq(amount / tokenRewardsDuration)
		})

		it('adds leftovers and correctly calculates rate if rewards distribution have NOT finished', async function () {
			const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()

			const rewards = await rewardToken.balanceLPOf(await staking.getAddress())

			const tokenRewardsDuration = await staking.tokenRewardsDuration()

			await staking.notifyTokenRewardAmount(rewards / 2n)

			await time.increase(tokenRewardsDuration / 2n)

			for (const staker of signers.slice(1, 4)) {
				await staking.connect(staker).getReward()
			}

			const latest = await time.latest()
			const tokenPeriodFinish = await staking.tokenPeriodFinish()
			const oldRewardRate = await staking.tokenRewardRate()

			// 25e18 (half) is not distributed from initialized 50e18
			const leftovers = (tokenPeriodFinish - BigInt(latest)) * oldRewardRate

			await staking.notifyTokenRewardAmount(rewards / 2n)

			const tokenRewardRate = await staking.tokenRewardRate()

			expect(tokenRewardRate).to.be.approximately((leftovers + rewards / 2n) / tokenRewardsDuration, 1e7)
		})
	})

	it('reverts on initializing more rewards, than there is on contract', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		let notify = staking.notifyTokenRewardAmount(rewards * 2n)

		await expect(notify).to.be.revertedWith('Provided reward too high')

		// ?????
		notify = staking.notifyTokenRewardAmount(rewards + BigInt(1000000e18))

		await expect(notify).to.be.revertedWith('Provided reward too high')
	})

	it('updates lastUpdateTime to current timestamp', async function () {
		const { staking, signers, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		const latestTimestamp = await time.latest()
		expect(await staking.lastUpdateTime()).to.be.eq(latestTimestamp)
	})

	it('updates tokenPeriodFinish to current timestamp + tokenRewardsDuration', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		const latestTimestamp = await time.latest()
		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		expect(await staking.tokenPeriodFinish()).to.be.eq(BigInt(latestTimestamp) + tokenRewardsDuration)
	})

	it('emits RewardAdded(uint256 reward) event', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		const notify = staking.notifyTokenRewardAmount(rewards)

		await expect(notify).to.emit(staking, 'RewardAdded').withArgs(rewards)
	})

	/* --- Scenarios --- */

	it('can initialize less rewards then there is on contract', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards / 2n)

		const tokenRewardRate = await staking.tokenRewardRate()
		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		expect(tokenRewardRate).to.be.eq(rewards / 2n / tokenRewardsDuration)
	})

	it('rewards can be initialized in process of rewards distribution', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards / 2n)

		await time.increase(tokenRewardsDuration / 2n)

		const tx = staking.notifyTokenRewardAmount(rewards / 2n)

		await expect(tx).not.to.be.reverted

		const tokenRewardRate = await staking.tokenRewardRate()
		expect(tokenRewardRate).to.be.approximately((rewards * 3n) / 4n / tokenRewardsDuration, 1e7)

		const latestTimestamp = await time.latest()
		const tokenPeriodFinish = await staking.tokenPeriodFinish()
		expect(tokenPeriodFinish).to.be.eq(BigInt(latestTimestamp) + tokenRewardsDuration)
	})

	it('rewards can be reinitialized after distribution ends', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceLPOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards / 2n)

		await time.increase(tokenRewardsDuration)

		const tx = staking.notifyTokenRewardAmount(rewards / 2n)

		await expect(tx).not.to.be.reverted

		const tokenRewardRate = await staking.tokenRewardRate()
		expect(tokenRewardRate).to.be.approximately(rewards / 2n / tokenRewardsDuration, 1e7)

		const latestTimestamp = await time.latest()
		const tokenPeriodFinish = await staking.tokenPeriodFinish()
		expect(tokenPeriodFinish).to.be.eq(BigInt(latestTimestamp) + tokenRewardsDuration)
	})

	it('rewards are not added to users if it wasn`t initialized', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		for (const staker of signers.slice(1, 4)) {
			const tokenEarned = await staking.tokenEarned(staker.address)
			expect(tokenEarned).to.be.eq(0)
		}

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration)

		for (const staker of signers.slice(1, 4)) {
			const tokenEarned = await staking.tokenEarned(staker.address)
			expect(tokenEarned).to.be.eq(0)
		}
	})
}
