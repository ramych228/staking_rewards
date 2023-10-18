import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

// TODO: ADD time: before finish, after finish

export const notifyAndStakerStake = function () {
    describe("Calling Reward Notify", function () {
        it('Stake before notify Token reward', async function () {
            const { signers, staking, rewardToken, stakingToken } = await getStakingContractWithStakers()
            const staker = signers[1];
            const tokenRewardAmount = ethers.parseEther("1");
    
            const stakerInitRewardBalance = await rewardToken.balanceOf(staker);
    
            // --------- ACTION -------------------  
    
            await staking.connect(staker).stake(tokenRewardAmount / 10n);
            await staking.notifyTokenRewardAmount(tokenRewardAmount);
    
            await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
            
            await staking.connect(staker).getReward();
            expect(await rewardToken.balanceOf(staker) - stakerInitRewardBalance).to.approximately(tokenRewardAmount, 10000n);
                
        })

        it('notify Token reward and stake right after it', async function () {
            const { signers, staking, rewardToken, stakingToken, tokenDuration } = await getStakingContractWithStakers()
            const staker = signers[1];
            const tokenRewardAmount = ethers.parseEther("9998");
    
            const stakerInitRewardBalance = await rewardToken.balanceOf(staker);
    
            // --------- ACTION -------------------  
    
            await staking.notifyTokenRewardAmount(tokenRewardAmount);
            await staking.connect(staker).stake(tokenRewardAmount / 10n);
    
            await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
            
            const tokenChange = tokenRewardAmount - (tokenRewardAmount / tokenDuration);
            await staking.connect(staker).getReward();
            expect(await rewardToken.balanceOf(staker) - stakerInitRewardBalance).to.approximately(tokenChange, 1000n);
        })

        it('notify Token reward and stake after X secs', async function () {
            const { signers, staking, rewardToken, stakingToken, tokenDuration } = await getStakingContractWithStakers()
            const staker = signers[1];
            const tokenRewardAmount = ethers.parseEther("1");
            
            const stakerInitRewardBalance = await rewardToken.balanceOf(staker);
    
            // --------- ACTION -------------------  
    
            await staking.notifyTokenRewardAmount(tokenRewardAmount);
    
            await time.increaseTo(await staking.tokenPeriodFinish() - ((tokenDuration / 2n) + 1n));
            await staking.connect(staker).stake(tokenRewardAmount / 10n);
            await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
    
            const tokenChange = tokenRewardAmount / 2n;
            await staking.connect(staker).getReward();
            expect(await rewardToken.balanceOf(staker) - stakerInitRewardBalance).to.approximately(tokenChange, 1000n);    
        })
    })

    describe("Calling Native Notify", function () {
        it('Stake before notify Native reward', async function () {
            const { signers, staking, rewardToken, stakingToken } = await getStakingContractWithStakers()
            const staker = signers[1];
            const tokenNativeAmount = ethers.parseEther("1");
    
            // ------------- ACTION ---------------------
    
            await staking.connect(staker).stake(tokenNativeAmount / 10n);
            await staking.notifyNativeRewardAmount(tokenNativeAmount, {value: tokenNativeAmount});
    
            await time.increaseTo(await staking.nativePeriodFinish() + 1n);
    
            await staking.connect(staker).exit();
            expect(await staking.balanceSTOf(staker)).to.approximately(tokenNativeAmount, 1000n);
        })

        it('notify Native reward and stake right after it', async function () {
            console.log("===========================> NEGA WAAAT TEST");
            console.log("Most likely the problem with RR, the bigger it is -- the more we wasting in accuracy");
    
            const { signers, staking, rewardToken, stakingToken, nativeDuration } = await getStakingContractWithStakers()
            const staker = signers[1];
            const tokenNativeAmount = ethers.parseEther("9999");
            const stakeAmount = ethers.parseEther("0.1");
    
            // ------------- ACTION ---------------------
    
            await staking.notifyNativeRewardAmount(tokenNativeAmount, {value: tokenNativeAmount});
            await staking.connect(staker).stake(stakeAmount);
    
            await time.increaseTo(await staking.nativePeriodFinish() + 100n);
    
            await staking.connect(staker).exit();
            const tokenChange = tokenNativeAmount - (tokenNativeAmount / nativeDuration);
            expect(await staking.balanceSTOf(staker)).to.approximately(tokenChange, 1000n);
        })
    
    
        it('notify Native reward and stake after X secs', async function () {
            console.log("=======================> Try to change the stakeAmount. Bigger it is -- more staker gain")
            const { signers, staking, rewardToken, stakingToken, nativeDuration } = await getStakingContractWithStakers()
            const staker = signers[1];
            const nativeRewardAmount = ethers.parseEther("4");
            const stakeAmount = ethers.parseEther("0.0006");
    
            // --------- ACTION -------------------  
            await staking.notifyNativeRewardAmount(nativeRewardAmount, {value: nativeRewardAmount});
    
            await time.increaseTo(await staking.nativePeriodFinish() - ((nativeDuration / 2n) + 1n));
            await staking.connect(staker).stake(stakeAmount);
    
            await time.increaseTo(await staking.nativePeriodFinish() + 1n);
            await staking.connect(staker).exit();
            
            const tokenChange = nativeRewardAmount / 2n;
            expect(await staking.balanceSTOf(staker)).to.approximately(tokenChange, 1000n);
        })
    })
}