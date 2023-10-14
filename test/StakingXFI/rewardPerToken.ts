import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { getStakingContracts, getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'
import { ethers } from 'hardhat'

export const rewardPerToken = function () {
	it('equals 0 on totalSupplyLP = 0', async function () {
		const { staking } = await getStakingContracts()
		const rewardPerToken = await staking.rewardPerToken()
		expect(rewardPerToken).to.be.eq(0)
	})

	it('after stakes and before notify equals 0', async function () {
		const { staking } = await getStakingContractsWithStakersAndRewards()
		const rewardPerToken = await staking.rewardPerToken()

		expect(rewardPerToken).to.be.eq(0)
	})

	it('after stakes and right after notify equals 0', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		const rewardPerToken = await staking.rewardPerToken()
		console.log('rewardPerTokenStored', await staking.rewardPerTokenStored())
		console.log('lastTimeRewardApplicable', await staking.lastTimeRewardApplicable())
		console.log('lastUpdateTime', await staking.lastUpdateTime())
		console.log('tokenRewardRate', await staking.tokenRewardRate())
		console.log('totalSupplyLP', await staking.totalSupplyLP())

		expect(rewardPerToken).to.be.eq(0)
	})

	it.skip(
		'What happens after tokenPeriodFinish and updateReward()? Seems like rewardPerToken should become smaller because of negative sub()'
	)

	it.skip('after stakes and some time after notify', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()

		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		const tokenRewardRate = await staking.tokenRewardRate()
		const totalSupplyLP = await staking.totalSupplyLP()

		const times = [1, 1000, 100000]
		let timePassed = 0

		for (const timeAmount of times) {
			await time.increase(timeAmount)
			timePassed += timeAmount
			const rewardPerToken = await staking.rewardPerToken()

			expect(rewardPerToken).to.be.eq((BigInt(timePassed) * tokenRewardRate * BigInt(1e18)) / totalSupplyLP)
		}
	})

	it('if there is no time last after lastUpdate then rewardPerToken should stay the same', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		await time.increase(1000)

		await staking.connect(signers[1]).stake(BigInt(5e18))

		const rewardPerToken1 = await staking.rewardPerToken()
		const rewardPerToken2 = await staking.rewardPerToken()

		expect(rewardPerToken1).to.be.eq(rewardPerToken2)
	})

	it.skip('after notify and 1000s and withdraw', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		await time.increase(1000)
		await staking.connect(signers[3]).withdraw(ethers.parseEther('2'))

		const rewardPerToken = await staking.rewardPerToken()

		expect(rewardPerToken).to.be.eq(3218235596707798n)
	})

	it.skip('after notify and 1000s and new stake and 1000s', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		await time.increase(1000)
		await staking.connect(signers[1]).stake(ethers.parseEther('5'))
		await time.increase(1000)

		const rewardPerToken = await staking.rewardPerToken()

		expect(rewardPerToken).to.be.eq(4971883183688707n)
	})

	it.skip('after notify and 1000s and withdraw and 1000s', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		await time.increase(1000)
		await staking.connect(signers[3]).withdraw(ethers.parseEther('2'))
		await time.increase(1000)

		const rewardPerToken = await staking.rewardPerToken()

		expect(rewardPerToken).to.be.eq(8040766460905298n)
	})

	it.skip('after notify and 1000s and withdraw and 1000s', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		await time.increase(1000)
		await staking.connect(signers[3]).withdraw(ethers.parseEther('2'))
		await time.increase(1000)

		const rewardPerToken = await staking.rewardPerToken()

		expect(rewardPerToken).to.be.eq(8040766460905298n)
	})

	it('can be calculated on every time', async function () {
		const { staking, rewardToken } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		/* --- 1/3 --- */
		await time.increase(tokenRewardsDuration / 3n)

		const totalSupplyLP = await staking.totalSupplyLP()

		// Update
		await staking.getReward()

		// Values
		let rewardPerToken = await staking.rewardPerToken()
		5555558770576096131n
		console.log('RPT', rewardPerToken)
		5555558770576096131n
		console.log('RPTS', await staking.rewardPerTokenStored())

		// Assert
		let calculatedRewardPerToken = ((rewardsAmount / 3n) * BigInt(1e18)) / totalSupplyLP
		const precision = 1000000n
		expect(rewardPerToken).to.be.within(
			calculatedRewardPerToken - calculatedRewardPerToken / precision,
			calculatedRewardPerToken + calculatedRewardPerToken / precision
		)

		/* --- 2/3 --- */

		await time.increase(tokenRewardsDuration / 3n)

		// Update
		await staking.getReward()

		// Values
		rewardPerToken = await staking.rewardPerToken()
		11111117541152192262n
		console.log('RPT', rewardPerToken)
		11111117541152192262n
		console.log('RPTS', await staking.rewardPerTokenStored())

		// Assert
		calculatedRewardPerToken = (((rewardsAmount * 2n) / 3n) * BigInt(1e18)) / totalSupplyLP
		expect(rewardPerToken).to.be.within(
			calculatedRewardPerToken - calculatedRewardPerToken / precision,
			calculatedRewardPerToken + calculatedRewardPerToken / precision
		)

		/* --- 3/3 --- */

		await time.increase(tokenRewardsDuration / 3n)

		// Update
		await staking.getReward()

		// Values
		rewardPerToken = await staking.rewardPerToken()
		16666666666666559998n
		console.log('RPT', rewardPerToken)
		16666666666666559998n
		console.log('RPTS', await staking.rewardPerTokenStored())

		// Assert
		calculatedRewardPerToken = (rewardsAmount * BigInt(1e18)) / totalSupplyLP
		expect(rewardPerToken).to.be.within(
			calculatedRewardPerToken - calculatedRewardPerToken / precision,
			calculatedRewardPerToken + calculatedRewardPerToken / precision
		)
	})

	it('can be calculated on every time with changing stakes', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		/* --- 1/3 --- */
		await time.increase(tokenRewardsDuration / 3n)

		let totalSupplyLP = await staking.totalSupplyLP()

		// Update
		await staking.connect(signers[1]).stake(BigInt(2e18))

		// Values
		let rewardPerToken = await staking.rewardPerToken()

		// Assert
		let calculatedRewardPerToken = ((rewardsAmount / 3n) * BigInt(1e18)) / totalSupplyLP

		expect(rewardPerToken).to.be.approximately(calculatedRewardPerToken, 1e13)

		/* --- 2/3 --- */

		await time.increase(tokenRewardsDuration / 3n)

		totalSupplyLP = await staking.totalSupplyLP()
		console.log(totalSupplyLP)

		// Update
		await staking.connect(signers[2]).stake(BigInt(2e18))

		// Values
		rewardPerToken = await staking.rewardPerToken()

		// Assert
		calculatedRewardPerToken = calculatedRewardPerToken + ((rewardsAmount / 3n) * BigInt(1e18)) / totalSupplyLP
		expect(rewardPerToken).to.be.approximately(calculatedRewardPerToken, 1e13)

		/* --- 3/3 --- */

		await time.increase(tokenRewardsDuration / 3n)

		totalSupplyLP = await staking.totalSupplyLP()

		// Update
		await staking.getReward()

		// Values
		rewardPerToken = await staking.rewardPerToken()

		// Assert
		calculatedRewardPerToken = calculatedRewardPerToken + ((rewardsAmount / 3n) * BigInt(1e18)) / totalSupplyLP
		expect(rewardPerToken).to.be.approximately(calculatedRewardPerToken, 1e13)
	})

	it('equals reward divided on totalSupplyLP if stakes didn`t change', async function () {
		const { staking, rewardToken, signers } = await getStakingContractsWithStakersAndRewards()
		const rewardsAmount = await rewardToken.balanceOf(await staking.getAddress())
		await staking.notifyTokenRewardAmount(rewardsAmount)

		const totalSupplyLP = await staking.totalSupplyLP()
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await time.increase(tokenRewardsDuration)

		// Values
		let rewardPerToken = await staking.rewardPerToken()

		// Assert
		let expectedRewardPerToken = (BigInt(100e18) * BigInt(1e18)) / totalSupplyLP

		expect(rewardPerToken).to.be.approximately(expectedRewardPerToken, 1e7)
	})
}
