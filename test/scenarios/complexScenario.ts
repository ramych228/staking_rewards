import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hardhat, { ethers } from 'hardhat'
import { getStakingContractsWithStakersAndRewards } from '../_.fixtures'
import { expect } from 'chai'
import { StakingCustomDuration } from '../../typechain-types'

export const complexScenario = async function () {
	it('Complex scenario on Token Reward', async function () {
		const yearInSeconds = BigInt(365 * 24 * 60 * 60)

		// Disabled to ignore traces from fixture
		hardhat.tracer.enabled = false
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()
		hardhat.tracer.enabled = true

		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

		const rewards = await rewardToken.balanceOf(await staking.getAddress())
		const tokenRewardsDuration = await staking.tokenRewardsDuration()

		await staking.notifyTokenRewardAmount(rewards)

		/* --- 1/3 of rewards duration --- */

		let stakeAmount1Staker1Period = BigInt(1e18)
		let stakeAmount2Staker1Period = BigInt(2e18)
		let stakeAmount3Staker1Period = BigInt(3e18)

		const totalShares1Period = (await staking.totalSupplyLP()) / AMOUNT_MULTIPLIER

		let staker1Shares1Period = await staking.balanceLPOf(signers[1].address)
		let staker2Shares1Period = await staking.balanceLPOf(signers[2].address)
		let staker3Shares1Period = await staking.balanceLPOf(signers[3].address)

		await time.increase(tokenRewardsDuration / 3n)

		/* --- 1/3 period - check reward --- */

		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[2]).getReward()
		await staking.connect(signers[3]).getReward()

		const staker1Reward1Period = await rewardToken.balanceOf(signers[1].address)
		const staker2Reward1Period = await rewardToken.balanceOf(signers[2].address)
		const staker3Reward1Period = await rewardToken.balanceOf(signers[3].address)

		const tokenRewardRate = (await staking.tokenRewardRate()) / AMOUNT_MULTIPLIER

		const staker1RewardCalculated =
			(staker1Shares1Period * tokenRewardRate * tokenRewardsDuration) / totalShares1Period / 3n
		const staker2RewardCalculated =
			(staker2Shares1Period * tokenRewardRate * tokenRewardsDuration) / totalShares1Period / 3n
		const staker3RewardCalculated =
			(staker3Shares1Period * tokenRewardRate * tokenRewardsDuration) / totalShares1Period / 3n

		expect(staker1Reward1Period).to.be.approximately(staker1RewardCalculated, 1e14)
		expect(staker2Reward1Period).to.be.approximately(staker2RewardCalculated, 1e14)
		expect(staker3Reward1Period).to.be.approximately(staker3RewardCalculated, 1e14)

		const totalRewardsDistributed1Period = staker1Reward1Period + staker2Reward1Period + staker3Reward1Period
		const totalRewardShouldBeDistributed1Period = rewards / 3n
		expect(totalRewardsDistributed1Period).to.be.approximately(totalRewardShouldBeDistributed1Period, 1e14)

		/* --- 2/3 of rewards duration --- */

		let stakeAmount1Staker2Period = BigInt(2e18)
		let stakeAmount2Staker2Period = BigInt(1e18)
		let stakeAmount3Staker2Period = BigInt(5e18)

		await staking.connect(signers[1]).stake(BigInt(1e18))
		await staking.connect(signers[2]).withdraw(BigInt(1e18))
		await staking.connect(signers[3]).stake(BigInt(2e18))

		let staker1Shares2Period =
			(await staking.balanceLPOf(signers[1].address)) + (await staking.balanceBPOf(signers[1].address))
		console.log('staker1Shares2Period', staker1Shares2Period)

		let staker2Shares2Period =
			(await staking.balanceLPOf(signers[2].address)) + (await staking.balanceBPOf(signers[2].address))
		let staker3Shares2Period =
			(await staking.balanceLPOf(signers[3].address)) + (await staking.balanceBPOf(signers[3].address))

		const totalShares2Period =
			((await staking.totalSupplyLP()) + (await staking.totalSupplyBP())) / AMOUNT_MULTIPLIER
		console.log('totalShares2Period', totalShares2Period)

		await time.increase(tokenRewardsDuration / 3n)

		/* --- 2/3 period - check rewards --- */

		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[2]).getReward()
		await staking.connect(signers[3]).getReward()

		const staker1Reward2Period = (await rewardToken.balanceOf(signers[1].address)) - staker1Reward1Period
		const staker2Reward2Period = (await rewardToken.balanceOf(signers[2].address)) - staker2Reward1Period
		const staker3Reward2Period = (await rewardToken.balanceOf(signers[3].address)) - staker3Reward1Period

		const staker1Reward2PeriodCalculated =
			(staker1Shares2Period * tokenRewardRate * tokenRewardsDuration) / totalShares2Period / 3n
		const staker2Reward2PeriodCalculated =
			(staker2Shares2Period * tokenRewardRate * tokenRewardsDuration) / totalShares2Period / 3n
		const staker3Reward2PeriodCalculated =
			(staker3Shares2Period * tokenRewardRate * tokenRewardsDuration) / totalShares2Period / 3n

		expect(staker1Reward2Period).to.be.approximately(staker1Reward2PeriodCalculated, 1e14)
		expect(staker2Reward2Period).to.be.approximately(staker2Reward2PeriodCalculated, 1e14)
		expect(staker3Reward2Period).to.be.approximately(staker3Reward2PeriodCalculated, 1e14)

		const totalRewardsDistributed2Period = staker1Reward2Period + staker2Reward2Period + staker3Reward2Period
		const totalRewardShouldBeDistributed2Period = rewards / 3n
		expect(totalRewardsDistributed2Period).to.be.approximately(totalRewardShouldBeDistributed2Period, 1e15)

		/* --- 3/3 of rewards duration --- */

		let stakeAmount1Staker3Period = BigInt(3e18)
		let stakeAmount2Staker3Period = BigInt(4e18)
		let stakeAmount3Staker3Period = BigInt(3e18)

		await staking.connect(signers[1]).stake(BigInt(1e18))
		await staking.connect(signers[2]).stake(BigInt(3e18))
		await staking.connect(signers[3]).withdraw(BigInt(2e18))

		let staker1Shares3Period =
			(await staking.balanceLPOf(signers[1].address)) + (await staking.balanceBPOf(signers[1].address))
		console.log('staker1Shares2Period', staker1Shares2Period)

		let staker2Shares3Period =
			(await staking.balanceLPOf(signers[2].address)) + (await staking.balanceBPOf(signers[2].address))
		let staker3Shares3Period =
			(await staking.balanceLPOf(signers[3].address)) + (await staking.balanceBPOf(signers[3].address))

		const totalShares3Period =
			((await staking.totalSupplyLP()) + (await staking.totalSupplyBP())) / AMOUNT_MULTIPLIER
		console.log('totalShares3Period', totalShares2Period)

		await time.increase(tokenRewardsDuration / 3n)

		/* --- 3/3 period - check rewards --- */

		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[2]).getReward()
		await staking.connect(signers[3]).getReward()

		const staker1Reward3Period =
			(await rewardToken.balanceOf(signers[1].address)) - staker1Reward2Period - staker1Reward1Period
		const staker2Reward3Period =
			(await rewardToken.balanceOf(signers[2].address)) - staker2Reward2Period - staker2Reward1Period
		const staker3Reward3Period =
			(await rewardToken.balanceOf(signers[3].address)) - staker3Reward2Period - staker3Reward1Period

		const staker1Reward3PeriodCalculated =
			(staker1Shares3Period * tokenRewardRate * tokenRewardsDuration) / totalShares3Period / 3n
		const staker2Reward3PeriodCalculated =
			(staker2Shares3Period * tokenRewardRate * tokenRewardsDuration) / totalShares3Period / 3n
		const staker3Reward3PeriodCalculated =
			(staker3Shares3Period * tokenRewardRate * tokenRewardsDuration) / totalShares3Period / 3n

		expect(staker1Reward3Period).to.be.approximately(staker1Reward3PeriodCalculated, 1e14)
		expect(staker2Reward3Period).to.be.approximately(staker2Reward3PeriodCalculated, 1e14)
		expect(staker3Reward3Period).to.be.approximately(staker3Reward3PeriodCalculated, 1e14)

		const totalRewardsDistributed3Period = staker1Reward3Period + staker2Reward3Period + staker3Reward3Period
		const totalRewardShouldBeDistributed3Period = rewards / 3n
		expect(totalRewardsDistributed3Period).to.be.approximately(totalRewardShouldBeDistributed3Period, 1e15)

		/* === Distribution finished === */

		const tokenPeriodFinish = await staking.tokenPeriodFinish()
		const latestTime = await time.latest()
		expect(latestTime).to.be.greaterThanOrEqual(tokenPeriodFinish)

		/* === Check rewards amounts === */

		const reward1Staker = await rewardToken.balanceOf(signers[1].address)
		const reward2Staker = await rewardToken.balanceOf(signers[2].address)
		const reward3Staker = await rewardToken.balanceOf(signers[3].address)

		expect(reward1Staker + reward2Staker + reward3Staker).to.be.lessThanOrEqual(rewards)

		console.log('Actual Reward For 1 Staker', reward1Staker)
		console.log('Actual Reward For 2 Staker', reward2Staker)
		console.log('Actual Reward For 3 Staker', reward3Staker)

		const rewardBalanceOfContract = await rewardToken.balanceOf(await staking.getAddress())

		// Contract distributed almost all the rewards
		const error = BigInt(1e7)
		expect(rewardBalanceOfContract).to.be.lessThanOrEqual(error)

		// Contract have transferred all distributed rewards to stakers
		// Calculation error is ~1-2 wei
		expect(reward1Staker + reward2Staker + reward3Staker).to.be.within(rewards - error, rewards)

		/* === Check BP accrued  === */
		{
			const BP1 = await staking.balanceBPOf(signers[1].address)
			const BP2 = await staking.balanceBPOf(signers[2].address)
			const BP3 = await staking.balanceBPOf(signers[3].address)
			const BP1Expected =
				((stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period) *
					tokenRewardsDuration) /
				3n /
				yearInSeconds
			const BP2Expected =
				((stakeAmount2Staker2Period + stakeAmount2Staker3Period) * tokenRewardsDuration) / 3n / yearInSeconds
			const BP3Expected = (stakeAmount3Staker3Period * tokenRewardsDuration) / 3n / yearInSeconds

			const BPerror = 1e13
			expect(BP1).to.be.approximately(BP1Expected, BPerror)
			expect(BP2).to.be.approximately(BP2Expected, BPerror)
			expect(BP3).to.be.approximately(BP3Expected, BPerror)
		}
	})

	it.skip('Ramil`s test', async function () {
		const yearInSeconds = BigInt(365 * 24 * 60 * 60)

		// Disabled to ignore traces from fixture
		hardhat.tracer.enabled = false
		const { signers, staking, rewardToken } = await getStakingContractsWithStakersAndRewards()
		hardhat.tracer.enabled = true

		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

		// Erase state from fixture
		await staking.connect(signers[1]).exit()
		await staking.connect(signers[2]).exit()
		await staking.connect(signers[3]).exit()

		await staking.connect(signers[1]).stake(BigInt(10e18))

		const nativeRewardsDuration = await staking.nativeRewardsDuration()

		await staking.notifyNativeRewardAmount(BigInt(100e18), { value: BigInt(100e18) })

		await time.increase(16)

		await staking.connect(signers[2]).stake(BigInt(10e18))

		await time.increase(nativeRewardsDuration)
		85.857142857142857142
		11.785714285714285714
		await staking.connect(signers[1]).getReward()
		await staking.connect(signers[2]).getReward()

		const reward1 = await staking.balanceSTOf(signers[1].address)
		const reward2 = await staking.balanceSTOf(signers[2].address)
	})

	it('Complex scenario on Native Reward', async function () {
		const yearInSeconds = BigInt(365 * 24 * 60 * 60)

		async function deployStaking(tokenRewardDuration: number, nativeRewardDuration: number) {
			const ERC20 = await ethers.getContractFactory('ERC20Mintable')
			const rewardToken = await ERC20.deploy('Reward Token', 'RWRD')
			const stakingToken = await ERC20.deploy('Staking Token', 'STKNG')

			const signers = await ethers.getSigners()
			const owner = signers[0]
			const duration = 50n

			const StakingRewards = await ethers.getContractFactory('StakingCustomDuration')
			const staking = await StakingRewards.deploy(
				owner.address,
				await rewardToken.getAddress(),
				await stakingToken.getAddress(),
				nativeRewardDuration,
				tokenRewardDuration
			)

			const amount = ethers.parseEther('100')

			await rewardToken.mint(await staking.getAddress(), amount)
			await rewardToken.mint(owner.address, amount)

			await stakingToken.mint(signers[1].address, amount)
			await stakingToken.mint(signers[2].address, amount)
			await stakingToken.mint(signers[3].address, amount)

			await stakingToken.connect(signers[1]).approve(await staking.getAddress(), amount)
			await stakingToken.connect(signers[2]).approve(await staking.getAddress(), amount)
			await stakingToken.connect(signers[3]).approve(await staking.getAddress(), amount)

			const stakeAmount = ethers.parseEther('1')
			await staking.connect(signers[1]).stake(stakeAmount)
			await staking.connect(signers[2]).stake(stakeAmount * 2n)
			await staking.connect(signers[3]).stake(stakeAmount * 3n)

			return {
				rewardToken,
				stakingToken,
				staking,
				signers,
				owner,
				duration,
			}
		}

		const nativeRewardDuration = [50, 60 * 24 * 60 * 60, 365 * 24 * 60 * 60]
		const rewardsDistribution = {
			// 50 seconds
			'50': [
				// 1 staker
				[
					// 1 period
					BigInt(5.3e18),
					// 2 period
					BigInt(11.13e18),
					// 3 period

					BigInt(18.13e18),
				],
				// 2 staker
				[
					// 1 period
					BigInt(10.6e18),
					// 2 period

					BigInt(20.17e18),
					// 3 period

					BigInt(31.29e18),
				],
				// 3 staker
				[
					// 1 period
					BigInt(16e18),
					// 2 period

					BigInt(32.69e18),
					// 3 period

					BigInt(50.57e18),
				],
			],
			// 60 days
			'60': [
				// 1 staker
				[
					// 1 period
					BigInt(5.555555555414387e18),
					// 2 period
					BigInt(11.660558700832999e18),
					// 3 period

					BigInt(18.087812867772133e18),
				],
				// 2 staker
				[
					// 1 period
					BigInt(11.111111110828775e18),
					// 2 period

					BigInt(20.826610749294574e18),
					// 3 period

					BigInt(31.61377692528187e18),
				],
				// 3 staker
				[
					// 1 period
					BigInt(16.666666666771878e18),
					// 2 period

					BigInt(34.179477927805046e18),
					// 3 period

					BigInt(50.29839091770081e18),
				],
			],
			// 365 days
			'365': [],
		}

		// for (const duration of nativeRewardDuration) {
		// 	testNativeDistribution(duration)
		// }
		await testNativeDistribution(nativeRewardDuration[1], rewardsDistribution[60])

		async function testNativeDistribution(nativeRewardDuration: number, rewardsDistribution: any) {
			const { staking, signers, rewardToken } = await deployStaking(0, nativeRewardDuration)
			const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

			const rewards = await rewardToken.balanceOf(await staking.getAddress())
			const nativeRewardsDuration = await staking.nativeRewardsDuration()

			await staking.notifyNativeRewardAmount(rewards, { value: BigInt(100e18) })
			const start = await time.latest()

			/* --- 1/3 of rewards duration --- */

			let stakeAmount1Staker1Period = BigInt(1e18)
			let stakeAmount2Staker1Period = BigInt(2e18)
			let stakeAmount3Staker1Period = BigInt(3e18)

			const totalShares1Period = (await staking.totalSupplyLP()) / AMOUNT_MULTIPLIER

			let staker1Shares1Period = await staking.balanceLPOf(signers[1].address)
			let staker2Shares1Period = await staking.balanceLPOf(signers[2].address)
			let staker3Shares1Period = await staking.balanceLPOf(signers[3].address)

			await time.increase(nativeRewardsDuration / 3n)

			/* --- 1/3 period - check reward --- */

			await staking.connect(signers[1]).getReward()
			await staking.connect(signers[2]).getReward()
			await staking.connect(signers[3]).getReward()

			const staker1Reward1Period = await staking.balanceSTOf(signers[1].address)
			const staker2Reward1Period = await staking.balanceSTOf(signers[2].address)
			const staker3Reward1Period = await staking.balanceSTOf(signers[3].address)

			expect(staker1Reward1Period).to.be.approximately(rewardsDistribution[0][0], 1e14)
			expect(staker2Reward1Period).to.be.approximately(rewardsDistribution[1][0], 1e14)
			expect(staker3Reward1Period).to.be.approximately(rewardsDistribution[2][0], 1e14)

			const totalRewardsDistributed1Period =
				rewardsDistribution[0][0] + rewardsDistribution[1][0] + rewardsDistribution[2][0]
			const totalRewardShouldBeDistributed1Period = rewards / 3n
			expect(totalRewardsDistributed1Period).to.be.approximately(totalRewardShouldBeDistributed1Period, 1e14)

			/* --- 2/3 of rewards duration --- */

			let stakeAmount1Staker2Period = BigInt(2e18)
			let stakeAmount2Staker2Period = BigInt(1e18)
			let stakeAmount3Staker2Period = BigInt(5e18)

			await staking.connect(signers[1]).stake(BigInt(1e18))
			await staking.connect(signers[2]).withdraw(BigInt(1e18))
			await staking.connect(signers[3]).stake(BigInt(2e18))

			await time.increase(nativeRewardsDuration / 3n)

			const end = await time.latest()

			console.log('Wait', end - start)

			/* --- 2/3 period - check rewards --- */
			await staking.connect(signers[1]).getReward()
			await staking.connect(signers[2]).getReward()
			await staking.connect(signers[3]).getReward()

			const staker1Reward2Period = await staking.balanceSTOf(signers[1].address)
			const staker2Reward2Period = await staking.balanceSTOf(signers[2].address)
			const staker3Reward2Period = await staking.balanceSTOf(signers[3].address)

			// 100e18 / 5184000 = 19290123456790 (14)
			console.log('\n\t Distributed in contract')
			console.log('staker1Reward2Period', Number(staker1Reward2Period) / 1e18)
			console.log('staker2Reward2Period', Number(staker2Reward2Period) / 1e18)
			console.log('staker3Reward2Period', Number(staker3Reward2Period) / 1e18)

			console.log('\n\t Distribution Diff')
			console.log('staker1Reward2Period ', Number(staker1Reward2Period - rewardsDistribution[0][1]) / 1e18)
			console.log('staker2Reward2Period', Number(staker2Reward2Period - rewardsDistribution[1][1]) / 1e18)
			console.log('staker3Reward2Period', Number(staker3Reward2Period - rewardsDistribution[2][1]) / 1e18)

			console.log('\n\tBonus Points 2 Period')
			console.log('staker 1', Number(await staking.balanceBPOf(signers[1].address)) / 1e18)
			console.log('staker 2', Number(await staking.balanceBPOf(signers[2].address)) / 1e18)
			console.log('staker 3', Number(await staking.balanceBPOf(signers[3].address)) / 1e18)

			// expect(staker1Reward2Period).to.be.approximately(rewardsDistribution[0][1], 1e14)
			// expect(staker2Reward2Period).to.be.approximately(rewardsDistribution[1][1], 1e14)
			// expect(staker3Reward2Period).to.be.approximately(rewardsDistribution[2][1], 1e14)

			const totalRewardsDistributed2Period = staker1Reward2Period + staker2Reward2Period + staker3Reward2Period
			const totalRewardShouldBeDistributed2Period = (rewards * 2n) / 3n

			console.log('Period 2')
			console.log('totalRewardsDistributed2Period', Number(totalRewardsDistributed2Period) / 1e18)
			console.log('totalRewardShouldBeDistributed2Period', Number(totalRewardShouldBeDistributed2Period) / 1e18)
			expect(totalRewardsDistributed2Period).to.be.approximately(totalRewardShouldBeDistributed2Period, 1e15)

			/* --- 3/3 of rewards duration --- */

			let stakeAmount1Staker3Period = BigInt(3e18)
			let stakeAmount2Staker3Period = BigInt(4e18)
			let stakeAmount3Staker3Period = BigInt(3e18)

			await staking.connect(signers[1]).stake(BigInt(1e18))
			await staking.connect(signers[2]).stake(BigInt(3e18))
			await staking.connect(signers[3]).withdraw(BigInt(2e18))

			await time.increase(nativeRewardsDuration / 3n)

			/* --- 3/3 period - check rewards --- */

			await staking.connect(signers[1]).getReward()
			await staking.connect(signers[2]).getReward()
			await staking.connect(signers[3]).getReward()

			const staker1Reward3Period = await staking.balanceSTOf(signers[1].address)
			const staker2Reward3Period = await staking.balanceSTOf(signers[2].address)
			const staker3Reward3Period = await staking.balanceSTOf(signers[3].address)

			expect(staker1Reward3Period).to.be.approximately(rewardsDistribution[0][2], 1e13)
			expect(staker2Reward3Period).to.be.approximately(rewardsDistribution[1][2], 1e13)
			expect(staker3Reward3Period).to.be.approximately(rewardsDistribution[2][2], 1e13)

			const totalRewardsDistributed3Period =
				rewardsDistribution[0][2] + rewardsDistribution[1][2] + rewardsDistribution[2][2]

			expect(totalRewardsDistributed3Period).to.be.approximately(rewards, 1e15)

			/* === Distribution finished === */

			const tokenPeriodFinish = await staking.tokenPeriodFinish()
			const latestTime = await time.latest()
			expect(latestTime).to.be.greaterThanOrEqual(tokenPeriodFinish)

			/* === Check rewards amounts === */

			const reward1Staker = await staking.balanceSTOf(signers[1].address)
			const reward2Staker = await staking.balanceSTOf(signers[2].address)
			const reward3Staker = await staking.balanceSTOf(signers[3].address)

			expect(reward1Staker + reward2Staker + reward3Staker).to.be.lessThanOrEqual(rewards)

			console.log('Actual Reward For 1 Staker', reward1Staker)
			console.log('Actual Reward For 2 Staker', reward2Staker)
			console.log('Actual Reward For 3 Staker', reward3Staker)

			const rewardBalanceOfContract = (await staking.totalSupplyST()) / AMOUNT_MULTIPLIER

			// Contract distributed almost all the rewards
			const error = BigInt(1e14)

			expect(rewardBalanceOfContract - rewards).to.be.lessThanOrEqual(error)

			// Contract have transferred all distributed rewards to stakers
			// Calculation error is ~1-2 wei
			expect(reward1Staker + reward2Staker + reward3Staker).to.be.within(rewards - error, rewards)

			/* === Check BP accrued  === */
			{
				const BP1 = await staking.balanceBPOf(signers[1].address)
				const BP2 = await staking.balanceBPOf(signers[2].address)
				const BP3 = await staking.balanceBPOf(signers[3].address)

				console.log(stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period)
				console.log(
					(stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period) *
						nativeRewardsDuration
				)

				console.log(
					((stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period) *
						nativeRewardsDuration) /
						3n /
						yearInSeconds
				)

				const BP1Expected =
					((stakeAmount1Staker1Period + stakeAmount1Staker2Period + stakeAmount1Staker3Period) *
						nativeRewardsDuration) /
					3n /
					yearInSeconds
				const BP2Expected =
					((stakeAmount2Staker2Period + stakeAmount2Staker3Period) * nativeRewardsDuration) /
					3n /
					yearInSeconds
				const BP3Expected = (stakeAmount3Staker3Period * nativeRewardsDuration) / 3n / yearInSeconds

				const BPerror = 1e12
				expect(BP1).to.be.approximately(BP1Expected, BPerror)
				expect(BP2).to.be.approximately(BP2Expected, BPerror)
				expect(BP3).to.be.approximately(BP3Expected, BPerror)
			}
		}
	})
}
