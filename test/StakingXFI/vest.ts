import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'
import { expect } from 'chai'

export const vest = function () {
	/* --- Units --- */

	it.skip('non-reentrant')

	it('calls updateReward() with msg.sender as a parameter', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		const vest = () => staking.connect(signers[1]).vest(BigInt(1e18))
		await expectUpdateRewardToBeCalled(vest, signers[1], staking, signers.slice(2, 4))
	})

	it('amount must be greater than 0', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const vestWith0Amount = staking.connect(signers[1]).vest(0)
		await expect(vestWith0Amount).to.be.revertedWith('Cannot vest 0')
	})

	it.only('decreases balanceST and balanceVST on amount that was vested and sets vestingFinishTime', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const nativeRewardsDuration = await staking.nativeRewardsDuration()
		await time.increase(nativeRewardsDuration)

		const amounts = [BigInt(1e18), BigInt(10e18), BigInt(1e9)]

		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

		for (const [i, amount] of amounts.entries()) {
			await staking.connect(signers[i + 1]).getReward()

			let vars = await staking.userVariables(signers[i + 1])
			const balanceVST = vars.balanceVST
			expect(balanceVST).to.be.eq(0)

			const balanceST = await staking.balanceSTOf(signers[i + 1])

			await staking.connect(signers[i + 1]).stake(amount * 10n)
			await staking.connect(signers[i + 1]).vest(amount)

			vars = await staking.userVariables(signers[i + 1])
			const newBalanceVST = vars.balanceVST
			const newBalanceST = await staking.balanceSTOf(signers[i + 1])

			expect(newBalanceVST).to.be.eq(amount * AMOUNT_MULTIPLIER)
			expect(newBalanceST).to.be.eq(balanceST - amount)
		}
	})

	it.skip('decreases totalSupplyST on amount vested', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const nativeRewardsDuration = await staking.nativeRewardsDuration()
		await time.increase(nativeRewardsDuration)

		const amounts = [1e18, 10e18, 1e9]

		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

		for (const [i, amount] of amounts.entries()) {
			await staking.getReward()

			let vars = await staking.userVariables(signers[i + 1])
			const balanceVST = vars.balanceVST
			const balanceST = await staking.balanceSTOf(signers[i + 1])
			console.log('User balance ST', balanceST)

			await staking.connect(signers[i + 1]).vest(balanceST)

			vars = await staking.userVariables(signers[i + 1])
			const newBalanceVST = vars.balanceVST

			expect(newBalanceVST).to.be.eq(BigInt(amount) * AMOUNT_MULTIPLIER)
			expect(totalSupplyAfter).to.be.eq(totalSupplyBefore + BigInt(amount))
		}
	})

	it.skip('require on staked LP amount')
	it.skip('require on amount to vest less than or equal balanceST')

	it.skip('increases balance of user', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amounts = [1e18, 10e18, 1e9]

		for (const [i, amount] of amounts.entries()) {
			const userBalanceBefore = await staking.balanceLPOf(signers[i + 1].address)

			await staking.connect(signers[i + 1]).stake(BigInt(amount))

			const userBalanceAfter = await staking.balanceLPOf(signers[i + 1].address)

			expect(userBalanceAfter).to.be.eq(userBalanceBefore + BigInt(amount))
		}
	})

	it.skip('doesn`t change balances of other users', async function () {
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

	it.skip('locks tokens on contract', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(1e18)
		const tx = staking.connect(signers[1]).stake(amount)

		await expect(tx).to.changeTokenBalances(stakingToken, [signers[1], staking], [-amount, amount])
	})

	it.skip('reverts if user doesn`t have enough funds or enough allowance', async function () {
		const { staking, signers, stakingToken } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(100e18)
		const stakeWithoutEnoughApprove = staking.connect(signers[1]).stake(amount)

		await expect(stakeWithoutEnoughApprove).to.be.revertedWith('ERC20: insufficient allowance')

		await stakingToken.connect(signers[1]).approve(await staking.getAddress(), amount)
		const stakeWithoutEnoughBalance = staking.connect(signers[1]).stake(amount)

		await expect(stakeWithoutEnoughBalance).to.be.revertedWith('ERC20: transfer amount exceeds balance')
	})

	it.skip('emits Staked event', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const amount = BigInt(1e18)
		const tx = staking.connect(signers[1]).stake(amount)

		await expect(tx).to.emit(staking, 'Staked').withArgs(signers[1].address, amount)
	})

	/* --- Scenarios --- */

	it.skip('right after stake user doesn`t have rewards to withdraw', async function () {
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
