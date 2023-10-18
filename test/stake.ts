import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'
import { expect } from 'chai'

export const stake = function () {
	/* --- Units --- */

	it('calls updateReward() with msg.sender as a parameter', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const stake = () => staking.connect(signers[1]).stake(BigInt(1e18))
		await expectUpdateRewardToBeCalled(stake, signers[1], staking, signers.slice(2, 4))
	})

	it('amount must be greater than 0', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const stakeWith0Amount = staking.connect(signers[1]).stake(0)
		await expect(stakeWith0Amount).to.be.revertedWith('Cannot stake 0')
	})

	it('increases totalSupplyLP on amount that was staked', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amounts = [1e18, 10e18, 1e9]

		for (const [i, amount] of amounts.entries()) {
			const totalSupplyBefore = await staking.totalSupplyLP()

			await staking.connect(signers[i + 1]).stake(BigInt(amount))

			const totalSupplyAfter = await staking.totalSupplyLP()

			expect(totalSupplyAfter).to.be.eq(totalSupplyBefore + BigInt(amount))
		}
	})

	it('increases balance of user', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amounts = [1e18, 10e18, 1e9]

		for (const [i, amount] of amounts.entries()) {
			const userBalanceBefore = await staking.balanceLPOf(signers[i + 1].address)

			await staking.connect(signers[i + 1]).stake(BigInt(amount))

			const userBalanceAfter = await staking.balanceLPOf(signers[i + 1].address)

			expect(userBalanceAfter).to.be.eq(userBalanceBefore + BigInt(amount))
		}
	})

	it('doesn`t change balances of other users', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amounts = [1e18, 10e18, 1e9]

		for (const [i, amount] of amounts.entries()) {
			const signersWithoutLastStaker = signers.filter((signer) => signer.address !== signers[i + 1].address)
			const otherStakers = signersWithoutLastStaker.slice(1, 3)

			const balancesBefore = []

			for (const staker of otherStakers) {
				const stakerBalance = await staking.balanceLPOf(staker.address)
				balancesBefore.push(stakerBalance)
			}

			await staking.connect(signers[i + 1]).stake(BigInt(amount))

			for (const [i, staker] of otherStakers.entries()) {
				const stakerBalanceAfter = await staking.balanceLPOf(staker.address)
				expect(stakerBalanceAfter).to.be.eq(balancesBefore[i])
			}
		}
	})

	it('locks tokens on contract', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(1e18)
		const tx = staking.connect(signers[1]).stake(amount)

		await expect(tx).to.changeTokenBalances(stakingToken, [signers[1], staking], [-amount, amount])
	})

	it('reverts if user doesn`t have enough funds or enough allowance', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(1000e18)
		const stakeWithoutEnoughApprove = staking.connect(signers[1]).stake(amount)

		await expect(stakeWithoutEnoughApprove).to.be.revertedWith('ERC20: insufficient allowance')

		await stakingToken.connect(signers[1]).approve(await staking.getAddress(), amount)
		const stakeWithoutEnoughBalance = staking.connect(signers[1]).stake(amount)

		await expect(stakeWithoutEnoughBalance).to.be.revertedWith('ERC20: transfer amount exceeds balance')
	})

	it('emits Staked event', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(1e18)
		const tx = staking.connect(signers[1]).stake(amount)

		await expect(tx).to.emit(staking, 'Staked').withArgs(signers[1].address, amount)
	})

	/* --- Scenarios --- */

	it('right after stake user doesn`t have rewards to withdraw', async function () {
		const { staking, signers, rewardToken, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewards)

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const amount = BigInt(90e18)

		await stakingToken.connect(signers[3]).transfer(signers[4].address, amount)
		await stakingToken.connect(signers[4]).approve(await staking.getAddress(), amount)
		await staking.connect(signers[4]).stake(amount)

		// While this tx appeared 1 sec already passed
		// So for 1 second of staking staker should get less than tokenRewardRate
		await staking.connect(signers[4]).getReward()

		const rewardRate = await staking.tokenRewardRate()
		const tokenEarned = await rewardToken.balanceOf(signers[4].address)

		expect(tokenEarned).to.be.lessThan(rewardRate)
	})
}
