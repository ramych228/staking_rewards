import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expectUpdateRewardToBeCalled } from './updateReward'
import { expect } from 'chai'
import { expectToBeRevertedWith } from './_utils'

export const vest = function () {
	/* --- Units --- */

	it('calls updateReward() with msg.sender as a parameter', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		await staking.connect(signers[1]).stake(BigInt(10e18))

		const vest = () => staking.connect(signers[1]).vest(BigInt(1e18))
		await expectUpdateRewardToBeCalled(vest, signers[1], staking, signers.slice(2, 4))
	})

	/* --- Requires --- */

	it('amount must be greater than 0', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const vestWith0Amount = staking.connect(signers[1]).vest(0)
		await expect(vestWith0Amount).to.be.revertedWith('Cannot vest 0')
	})

	it('require on staked LP amount', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const tokenRewardsDuration = await staking.tokenRewardsDuration()
		await time.increase(tokenRewardsDuration / 3n)

		let vest = staking.connect(signers[1]).vest(BigInt(1e18))
		await expect(vest).to.be.revertedWith('You should have more staked LP tokens')

		let balanceLP = await staking.balanceLPOf(signers[1].address)

		vest = staking.connect(signers[1]).vest(balanceLP / 10n + 1n)
		await expect(vest).to.be.revertedWith('You should have more staked LP tokens')

		vest = staking.connect(signers[1]).vest(balanceLP / 10n)
		await expect(vest).not.to.be.reverted
	})

	it('require on amount to vest less than or equal balanceST', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()
		const rewards = BigInt(100e18)
		await staking.notifyNativeRewardAmount(rewards, { value: rewards })

		const nativeRewardsDuration = await staking.nativeRewardsDuration()
		await time.increase(nativeRewardsDuration)

		await staking.connect(signers[1]).getReward()

		let vest = staking.connect(signers[1]).vest(BigInt(100e18))
		await expect(vest).to.be.revertedWith('Cannot vest more then balance')

		let balanceST = await staking.balanceSTOf(signers[1].address)
		vest = staking.connect(signers[1]).vest(balanceST + 1n)
		await expect(vest).to.be.revertedWith('Cannot vest more then balance')

		balanceST = await staking.balanceSTOf(signers[1].address)
		vest = staking.connect(signers[1]).vest(balanceST)
		await expect(vest).not.to.be.revertedWith('Cannot vest more then balance')
	})
	/* --- Requires --- */

	it('decreases balanceST, balanceVST and totalSupplyST on amount that was vested and sets vestingFinishTime', async function () {
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
			const oldTotalSupplyST = await staking.totalSupplyST()

			await staking.connect(signers[i + 1]).stake(amount * 10n)
			const tx = staking.connect(signers[i + 1]).vest(amount)
			await expect(tx)
				.to.emit(staking, 'Vesting')
				.withArgs(signers[i + 1].address, amount)

			vars = await staking.userVariables(signers[i + 1])
			const newBalanceVST = vars.balanceVST
			const newBalanceST = await staking.balanceSTOf(signers[i + 1])
			const newTotalSupplyST = await staking.totalSupplyST()

			expect(newBalanceVST).to.be.eq(amount * AMOUNT_MULTIPLIER)
			expect(newBalanceST).to.be.eq(balanceST - amount)
			expect(newTotalSupplyST).to.be.eq(oldTotalSupplyST - amount)
		}
	})
}
