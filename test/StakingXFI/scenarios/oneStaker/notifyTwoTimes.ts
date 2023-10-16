import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

// TODO: Add more different time 


export const notifyTwoTimes = function () {
    it("notify 4 times at almost the same time", async function(){
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenRewardAmount1 = ethers.parseEther("1");
        const tokenRewardAmount2 = ethers.parseEther("3");
        const tokenStakeAmount = ethers.parseEther("0.1");

        // ----------- ACTION ---------------
        await staking.connect(staker).stake(tokenStakeAmount);
        const periodFinish = (await time.latest()) + Number(duration);
        await staking.notifyTokenRewardAmount(tokenRewardAmount1);
        await staking.notifyTokenRewardAmount(tokenRewardAmount1);
        await staking.notifyTokenRewardAmount(tokenRewardAmount1);
        await staking.notifyTokenRewardAmount(tokenRewardAmount1);

        await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
        await staking.connect(staker).getReward()

        const balanceChange = tokenRewardAmount1 + tokenRewardAmount2;
        expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange, 100n);
        expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish, 5n);
    })

    it("notify 1 and notify 2 at almost the same time", async function(){
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenRewardAmount1 = ethers.parseEther("1");
        const tokenRewardAmount2 = ethers.parseEther("3");
        const tokenStakeAmount = ethers.parseEther("0.1");

        // ----------- ACTION ---------------
        await staking.connect(staker).stake(tokenStakeAmount);
        const periodFinish = (await time.latest()) + Number(duration);
        await staking.notifyTokenRewardAmount(tokenRewardAmount1);
        await staking.notifyTokenRewardAmount(tokenRewardAmount2);

        await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
        await staking.connect(staker).getReward()

        const balanceChange = tokenRewardAmount1 + tokenRewardAmount2;
        expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange, 100n);
        expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish, 5n);
    })

    it("notify 1 and after X secs notify 2", async function(){
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenRewardAmount1 = ethers.parseEther("1");
        const tokenRewardAmount2 = ethers.parseEther("3");
        const tokenStakeAmount = ethers.parseEther("0.1");

        // ----------- ACTION ---------------
        await staking.connect(staker).stake(tokenStakeAmount);
        const periodFinish = (await time.latest()) + Number(duration);
        await staking.notifyTokenRewardAmount(tokenRewardAmount1);

        await time.increaseTo(await staking.tokenPeriodFinish() - ((duration / 2n) + 1n));
        await staking.connect(staker).getReward();

        const balanceChange = tokenRewardAmount1 / 2n;
        expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange, 100n);
        expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish, 5n);

        await staking.notifyTokenRewardAmount(tokenRewardAmount2);
        expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish + Number(duration), 30n);

        await time.increase(await staking.tokenPeriodFinish() + 1n);
        await staking.connect(staker).getReward();
        
        const balanceChange2 = tokenRewardAmount1 + tokenRewardAmount2; 
        expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange2, 100n);
    })
}