import { expect } from 'chai'
import { getStakingContracts, getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expectUpdateRewardToBeCalled } from './updateReward'

export const withdraw = function () {
	/* --- Units --- */

	it.skip('non-reentrant')

	it('calls updateReward() with msg.sender as a parameter', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards)

		const rewardsDuration = await staking.rewardsDuration()
		await time.increase(rewardsDuration / 3n)

		const stake = () => staking.connect(signers[1]).withdraw(BigInt(1e18))
		await expectUpdateRewardToBeCalled(stake, signers[1], staking, signers.slice(2, 4))
	})

	it('amount must be greater than 0', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const withdrawWithZeroAmount = staking.connect(signers[3]).withdraw(0)

		await expect(withdrawWithZeroAmount).to.be.rejectedWith('Cannot withdraw 0')
	})

	it('decreases totalSupply on amount withdrawn', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amounts = [1e18, 2e18, 1e9]

		for (const [i, amount] of amounts.entries()) {
			const totalSupplyBefore = await staking.totalSupply()

			await staking.connect(signers[i + 1]).withdraw(BigInt(amount))

			const totalSupplyAfter = await staking.totalSupply()

			expect(totalSupplyAfter).to.be.eq(totalSupplyBefore - BigInt(amount))
		}
	})

	it('decreases balance of user by amount withdrawn', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amounts = [1e18, 2e18, 1e9]

		for (const [i, amount] of amounts.entries()) {
			const userBalanceBefore = await staking.balanceOf(signers[i + 1].address)

			await staking.connect(signers[i + 1]).withdraw(BigInt(amount))

			const userBalanceAfter = await staking.balanceOf(signers[i + 1].address)

			expect(userBalanceAfter).to.be.eq(userBalanceBefore - BigInt(amount))
		}
	})

	it('doesn`t change balances of other users', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amounts = [1e18, 2e18, 1e9]

		for (const [i, amount] of amounts.entries()) {
			const signersWithoutLastStaker = signers.filter((signer) => signer.address !== signers[i + 1].address)
			const otherStakers = signersWithoutLastStaker.slice(1, 3)

			const balancesBefore = []

			for (const staker of otherStakers) {
				const stakerBalance = await staking.balanceOf(staker.address)
				balancesBefore.push(stakerBalance)
			}

			await staking.connect(signers[i + 1]).withdraw(BigInt(amount))

			for (const [i, staker] of otherStakers.entries()) {
				const stakerBalanceAfter = await staking.balanceOf(staker.address)
				expect(stakerBalanceAfter).to.be.eq(balancesBefore[i])
			}
		}
	})

	it('unlocks tokens from contract', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(1e18)
		const tx = staking.connect(signers[1]).withdraw(amount)

		await expect(tx).to.changeTokenBalances(stakingToken, [signers[1], staking], [amount, -amount])
	})

	it('reverts if user tries to transfer more than he have on balance', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		let amount = BigInt(2e18)
		const withdrawOfMoreThanUserHave = staking.connect(signers[1]).withdraw(amount)

		await expect(withdrawOfMoreThanUserHave).to.be.revertedWithPanic(0x11)

		amount = BigInt(100e18)
		const withdrawOfMoreThanTotalSupply = staking.connect(signers[1]).withdraw(amount)

		await expect(withdrawOfMoreThanTotalSupply).to.be.revertedWithPanic(0x11)
	})

	it('emits Withdrawn event', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(1e18)
		const tx = staking.connect(signers[1]).withdraw(amount)

		await expect(tx).to.emit(staking, 'Withdrawn').withArgs(signers[1].address, amount)
	})

	/* --- Scenarios --- */

	it('after full withdrawal user doesn`t get any more rewards', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards)

		const rewardsDuration = await staking.rewardsDuration()
		await time.increase(rewardsDuration / 3n)

		const balance = await staking.balanceOf(signers[1].address)
		await staking.connect(signers[1]).withdraw(balance)
		const earnedRewards = await staking.rewards(signers[1])

		await time.increase(rewardsDuration / 3n)

		expect(await staking.earned(signers[1])).to.be.eq(earnedRewards)
	})

	it('after partial withdrawal user gets less rewards', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyRewardAmount(rewards)

		const rewardsDuration = await staking.rewardsDuration()
		await time.increase(rewardsDuration / 2n)

		const amount = BigInt(2e18)
		await staking.connect(signers[3]).withdraw(amount)
		const earnedRewards = await staking.rewards(signers[3])

		await time.increase(rewardsDuration / 2n)

		expect(await staking.earned(signers[3])).to.be.approximately(earnedRewards + earnedRewards / 2n, 1e13)
	})

	it('full withdraw right after stake returns same amount of tokens', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(3e18)

		await stakingToken.connect(signers[3]).transfer(signers[4].address, amount)
		await stakingToken.connect(signers[4]).approve(await staking.getAddress(), amount)

		await staking.connect(signers[4]).stake(amount)
		await staking.connect(signers[4]).withdraw(amount)

		const userBalance = await staking.balanceOf(signers[4].address)
		expect(userBalance).to.be.eq(0)
	})
}
