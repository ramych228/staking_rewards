import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'
// TODO: ADD a lot of stakes at the same time
export const stakeWithdrawStake = async function () {
	describe('Calling Reward Notify ', function () {
		it('stake BEFORE notify, withdraw X tokens several times in the middle of reward duration', async function () {
			const { signers, staking, rewardToken, stakingToken, tokenDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const stakeAmount = ethers.parseEther('100')
			const tokenRewardAmount = ethers.parseEther('1')

			const stakerInitRewardBalance = await rewardToken.balanceOf(staker)

			// ----------- ACTION ---------------
			// console.log("the reward token balance of staker", await rewardToken.balanceOf(staker));

			// FIRST STAKE
			await staking.connect(staker).stake(stakeAmount)
			await staking.notifyTokenRewardAmount(tokenRewardAmount)

			await time.increaseTo((await staking.tokenPeriodFinish()) - (tokenDuration / 2n + 1n))

			const balanceChange = tokenRewardAmount / 2n
			await staking.connect(staker).getReward()
			expect((await rewardToken.balanceOf(staker)) - stakerInitRewardBalance).to.approximately(
				balanceChange,
				10000n
			)
			// console.log("2 the reward token balance of staker", await rewardToken.balanceOf(staker));

			// WITHDRAWING COUPLE TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
			for (let i = 0; i < 10; i++) {
				// was 100
				await staking.connect(staker).withdraw(stakeAmount / 200n)
				// console.log(await staking.balanceLPOf(staker));
			}
			await time.increaseTo((await staking.tokenPeriodFinish()) + 1000000n)
			await staking.connect(staker).getReward()

			// console.log("3 the reward token balance of staker", await rewardToken.balanceOf(staker));
			expect(await rewardToken.balanceOf(staker)).to.approximately(tokenRewardAmount, 1000n) // with 50 sec 100n was enough -> accuracy goes down with while time goes by
		})

		it('stake AFTER notify, withdraw X tokens several times in the middle of reward duration', async function () {
			const { signers, staking, rewardToken, stakingToken, tokenDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const stakeAmount = ethers.parseEther('100')
			const tokenRewardAmount = ethers.parseEther('10')
			const stakerInitRewardBalance = await rewardToken.balanceOf(staker)

			// ----------- ACTION ---------------

			await staking.notifyTokenRewardAmount(tokenRewardAmount)
			// FIRST STAKE
			await staking.connect(staker).stake(stakeAmount)

			await time.increaseTo((await staking.tokenPeriodFinish()) - (tokenDuration / 2n + 1n))

			const balanceChange = tokenRewardAmount / 2n - tokenRewardAmount / tokenDuration
			await staking.connect(staker).getReward()
			expect((await rewardToken.balanceOf(staker)) - stakerInitRewardBalance).to.approximately(
				balanceChange,
				10000n
			)

			// WITHDRAWING COUPLE TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
			for (let i = 0; i < 10; i++) {
				// was 100
				await staking.connect(staker).withdraw(stakeAmount / 200n)
				// console.log(await staking.balanceLPOf(staker));
			}
			await time.increaseTo((await staking.tokenPeriodFinish()) + 1000000n)
			await staking.connect(staker).getReward()

			expect(await rewardToken.balanceOf(staker)).to.approximately(
				tokenRewardAmount - tokenRewardAmount / tokenDuration,
				1000n
			)
		})

		it('stake IN THE MIDDLE of reward duration after notify, withdraw X tokens in the middle', async function () {
			const { signers, staking, rewardToken, stakingToken, tokenDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const stakeAmount = ethers.parseEther('100')
			const tokenRewardAmount = ethers.parseEther('10')
			const stakerInitRewardBalance = await rewardToken.balanceOf(staker)

			// ----------- ACTION ---------------

			await staking.notifyTokenRewardAmount(tokenRewardAmount)

			await time.increaseTo((await staking.tokenPeriodFinish()) - (tokenDuration / 2n + 1n))

			// FIRST STAKE IN THE MIDDLE AFTER NOTIFY
			await staking.connect(staker).stake(stakeAmount)

			const balanceChange = tokenRewardAmount / tokenDuration
			await staking.connect(staker).getReward()
			expect((await rewardToken.balanceOf(staker)) - stakerInitRewardBalance).to.approximately(
				balanceChange,
				10000n
			)

			// WITHDRAWING COUPLE TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
			for (let i = 0; i < 10; i++) {
				// was 100
				await staking.connect(staker).withdraw(stakeAmount / 200n)
				// console.log(await staking.balanceLPOf(staker));
			}
			await time.increaseTo((await staking.tokenPeriodFinish()) + 1000000n)
			await staking.connect(staker).getReward()

			expect(await rewardToken.balanceOf(staker)).to.approximately(tokenRewardAmount / 2n, 1000n)
		})
	})

	describe('Calling Native Notify', function () {
		it('stake BEFORE notify, withdraw X tokens in the middle of reward duration (NativeNotify)', async function () {
			const { signers, staking, rewardToken, stakingToken, nativeDuration } =
				await getStakingContractWithStakers()
			const staker = signers[1]
			const stakeAmount = ethers.parseEther('1')
			const tokenRewardAmount = ethers.parseEther('5000')

			// ----------- ACTION ---------------

			// FIRST STAKE
			await staking.connect(staker).stake(stakeAmount)
			await staking.notifyNativeRewardAmount(tokenRewardAmount, { value: tokenRewardAmount })
			await time.increaseTo((await staking.nativePeriodFinish()) - (nativeDuration / 2n + 1n))

			// WITHDRAWING COUPLE OF TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
			for (let i = 0; i < 2; i++) {
				// was 100
				await staking.connect(staker).withdraw(stakeAmount / 500n)
				// console.log(await staking.balanceLPOf(staker));
			}

			await time.increaseTo((await staking.nativePeriodFinish()) + 1000000n)

			await staking.connect(staker).exit()
			expect(await staking.balanceSTOf(staker)).to.approximately(tokenRewardAmount, 10000n)
		})

		it('stake AFTER notify, withdraw X tokens several times in the middle of reward duration', async function () {
			const { signers, staking, stakingToken, nativeDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const stakeAmount = ethers.parseEther('0.001')
			const tokenRewardAmount = ethers.parseEther('7000')

			// ----------- ACTION ---------------

			await staking.notifyNativeRewardAmount(tokenRewardAmount, { value: tokenRewardAmount })
			// STAKE
			await staking.connect(staker).stake(stakeAmount)
			await time.increaseTo((await staking.nativePeriodFinish()) - (nativeDuration / 2n + 1n))

			const balanceChange = tokenRewardAmount / 2n - tokenRewardAmount / nativeDuration
			await staking.connect(staker).getReward()
			// expect(await staking.balanceSTOf(staker)).to.approximately(balanceChange, 10000n);

			// WITHDRAWING COUPLE TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
			for (let i = 0; i < 10; i++) {
				// was 100
				await staking.connect(staker).withdraw(stakeAmount / 200n)
				// console.log(await staking.balanceLPOf(staker));
			}
			await time.increaseTo((await staking.nativePeriodFinish()) + 1000000n)
			await staking.connect(staker).getReward()

			expect(await staking.balanceSTOf(staker)).to.approximately(
				tokenRewardAmount - tokenRewardAmount / nativeDuration,
				10000n
			)
		})
	})
}
