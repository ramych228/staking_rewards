import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

export const notifyTwoTimes = function () {
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
        await staking.connect(staker).getReward()

        const balanceChange = ethers.parseEther("0.5");
        expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange, 100n);
        expect(await staking.tokenPeriodFinish()).to.approximately(periodFinish, 5n);

        console.log(await rewardToken.balanceOf(staking));
        await staking.notifyTokenRewardAmount(tokenRewardAmount2);
        expect(await staking.tokenPeriodFinish()).to.equal(periodFinish + Number(duration));

        await time.increase(await staking.tokenPeriodFinish() + 1n);

        const balanceChange2 = ethers.parseEther("3.5"); 
        expect(await rewardToken.balanceOf(staker)).to.approximately(balanceChange2, 100n);

    })
}