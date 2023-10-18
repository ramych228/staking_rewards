import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

// TODO: Add more different time

export const notifyTwoTimes = function () {
	describe('Calling Reward Notify', function () {
		it('notifyReward 4 times at almost the same time', async function () {
			const { signers, staking, rewardToken, tokenDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const tokenRewardAmount = ethers.parseEther('1000')
			const tokenStakeAmount = ethers.parseEther('0.0001')

			// ----------- ACTION ---------------
			await staking.connect(staker).stake(tokenStakeAmount)
			const periodFinish = (await time.latest()) + Number(tokenDuration)

			for (let i = 0; i < 4; i++) {
				await staking.notifyTokenRewardAmount(tokenRewardAmount)
			}

			await time.increaseTo((await staking.tokenPeriodFinish()) + 1n)
			await staking.connect(staker).getReward()

			const balanceChange = tokenRewardAmount * 4n
			expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange, 10000n)
			expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish, 5n)
		})

		it('notify 1 and notify 2 at almost the same time', async function () {
			const { signers, staking, rewardToken, tokenDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const tokenRewardAmount1 = ethers.parseEther('1')
			const tokenRewardAmount2 = ethers.parseEther('3')
			const tokenStakeAmount = ethers.parseEther('0.1')

			// ----------- ACTION ---------------
			await staking.connect(staker).stake(tokenStakeAmount)
			const periodFinish = (await time.latest()) + Number(tokenDuration)
			await staking.notifyTokenRewardAmount(tokenRewardAmount1)
			await staking.notifyTokenRewardAmount(tokenRewardAmount2)

			await time.increaseTo((await staking.tokenPeriodFinish()) + 1n)
			await staking.connect(staker).getReward()

			const balanceChange = tokenRewardAmount1 + tokenRewardAmount2
			expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange, 1000n)
			expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish, 5n)
		})

		it('notify 1 and after X secs notify 2', async function () {
			const { signers, staking, rewardToken, tokenDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const tokenRewardAmount1 = ethers.parseEther('1')
			const tokenRewardAmount2 = ethers.parseEther('3')
			const tokenStakeAmount = ethers.parseEther('0.1')

			// ----------- ACTION ---------------
			await staking.connect(staker).stake(tokenStakeAmount)
			const periodFinish = (await time.latest()) + Number(tokenDuration)
			await staking.notifyTokenRewardAmount(tokenRewardAmount1)

			await time.increaseTo((await staking.tokenPeriodFinish()) - (tokenDuration / 2n + 1n))
			await staking.connect(staker).getReward()

			const balanceChange = tokenRewardAmount1 / 2n
			expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange, 100n)
			expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish, 5n)

			await staking.notifyTokenRewardAmount(tokenRewardAmount2)
			// expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish + Number(tokenDuration), 1000000n);

			await time.increase((await staking.tokenPeriodFinish()) + 1n)
			await staking.connect(staker).getReward()

			const balanceChange2 = tokenRewardAmount1 + tokenRewardAmount2
			expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange2, 1000n)
		})
	})

	describe('Calling Native Notify', function () {
		it('multiple notify Native reward and stake right after it', async function () {
			const { signers, staking, nativeDuration } = await getStakingContractWithStakers()
			const staker = signers[1]
			const tokenNativeAmount = ethers.parseEther('9999')
			const stakeAmount = ethers.parseEther('0.1')

			// ------------- ACTION ---------------------
			await signers[1].sendTransaction({ to: signers[0], value: tokenNativeAmount })
			await signers[2].sendTransaction({ to: signers[0], value: tokenNativeAmount })

			// ------------- NOTIFIES -------------------
			for (let i = 0; i < 3; i++) {
				await staking.notifyNativeRewardAmount(tokenNativeAmount, { value: tokenNativeAmount })
			}
			// ------------- STAKE ----------------------
			await staking.connect(staker).stake(stakeAmount)

			await time.increaseTo((await staking.nativePeriodFinish()) + 1n)

			// ------------- EXIT -----------------------
			await staking.connect(staker).exit()

			const tokenChange = 3n * tokenNativeAmount - 3n * (tokenNativeAmount / nativeDuration)
			// console.log('The stakers esXFI balance is ', ethers.formatUnits(await staking.balanceSTOf(staker)))
			// console.log('Should be                    ', ethers.formatUnits(tokenChange))

			expect(await staking.balanceSTOf(staker)).to.approximately(tokenChange, BigInt(1e16))
		})

		it('notifyNative 4 times at almost the same time', async function () {
			const { signers, staking } = await getStakingContractWithStakers()
			const staker = signers[1]
			const tokenNativeAmount = ethers.parseEther('1000')
			const tokenStakeAmount = ethers.parseEther('0.0001')

			// ----------- ACTION ---------------
			await staking.connect(staker).stake(tokenStakeAmount)

			for (let i = 0; i < 4; i++) {
				await staking.notifyNativeRewardAmount(tokenNativeAmount, { value: tokenNativeAmount })
			}

			await time.increaseTo((await staking.nativePeriodFinish()) + 1n)
			await staking.connect(staker).getReward()

			const balanceChange = tokenNativeAmount * 4n
			expect(await staking.balanceSTOf(staker)).to.approximately(balanceChange, 10000n)
			// expect(await staking.nativePeriodFinish()).to.approximately(periodFinish, 500n);
		})
	})
}
