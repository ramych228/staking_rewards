import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

export const notifyAndStakerStake = function () {
	it('Stake before notify Token reward', async function () {
        const { signers, staking, rewardToken, stakingToken } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenRewardAmount = ethers.parseEther("1");

        // --------- ACTION -------------------  

        await staking.connect(staker).stake(tokenRewardAmount / 10n);
        await staking.notifyTokenRewardAmount(tokenRewardAmount);

        await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
        
        await expect(staking.connect(staker).getReward()).to.changeTokenBalances(rewardToken, [staker, staking], [tokenRewardAmount, -tokenRewardAmount]);    
    })

    it('Stake before notify Native reward', async function () {
        const { signers, staking, rewardToken, stakingToken } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenNativeAmount = ethers.parseEther("1");

        // ------------- ACTION ---------------------

        await staking.connect(staker).stake(tokenNativeAmount / 10n);
        await staking.notifyNativeRewardAmount(tokenNativeAmount, {value: tokenNativeAmount});

        await time.increaseTo(await staking.nativePeriodFinish() + 1n);

        await staking.connect(staker).exit();
        expect(await staking.balanceSTOf(staker)).to.equals(tokenNativeAmount);
    })

    it('notify Token reward and stake right after it', async function () {
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenRewardAmount = ethers.parseEther("1");

        // --------- ACTION -------------------  

        await staking.notifyTokenRewardAmount(tokenRewardAmount);
        await staking.connect(staker).stake(tokenRewardAmount / 10n);

        await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
        
        const tokenChange = tokenRewardAmount - (tokenRewardAmount / duration)
        await expect(staking.connect(staker).getReward()).to.changeTokenBalances(rewardToken, [staker, staking], [tokenChange, -tokenChange]);    
    })

    it('notify Native reward and stake right after it', async function () {
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenNativeAmount = ethers.parseEther("1");

        // ------------- ACTION ---------------------

        await staking.notifyNativeRewardAmount(tokenNativeAmount, {value: tokenNativeAmount});
        await staking.connect(staker).stake(tokenNativeAmount / 10n);

        await time.increaseTo(await staking.nativePeriodFinish() + 1n);

        await staking.connect(staker).exit();
        const tokenChange = tokenNativeAmount - (tokenNativeAmount / duration)
        expect(await staking.balanceSTOf(staker)).to.equals(tokenChange);
    })
}