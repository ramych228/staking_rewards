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

        await staking.connect(staker).stake(tokenRewardAmount / 10n);
        await staking.notifyTokenRewardAmount(tokenRewardAmount);

        await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
        
        await staking.connect(staker).getReward();
        console.log("the reward is ", await rewardToken.balanceOf(staker));
        console.log("the balance of staked tokens is", await staking.balanceLPOf(staker));
        // const getReward = staking.connect(staker).getReward();
        // await expect(getReward).to.changeTokenBalances(stakingToken, [staker, staking], [tokenRewardAmount, -tokenRewardAmount]);    
        // console.log(await rewardToken.balanceOf(staker));
    })

    it.skip('Stake before notify Native reward', async function () {
        const { signers, staking, rewardToken, stakingToken } = await getStakingContractWithStakers()

        const staker = signers[1];
        const tokenNativeAmount = ethers.parseEther("1");


        console.log(await ethers.provider.getBalance(signers[0]))
        const transaction = await signers[0].sendTransaction({to: staking, value: tokenNativeAmount});
        transaction.wait();
        console.log("the first");
        await staking.connect(staker).stake(tokenNativeAmount / 10n);

        console.log("the second");
        await staking.notifyNativeRewardAmount(tokenNativeAmount);

        await time.increaseTo(await staking.tokenPeriodFinish() + 1n);

        console.log("the ST token amount ", await staking.balanceSTOf(staker));
        
        // await staking.connect(staker).getReward();
        // console.log("the reward is ", await rewardToken.balanceOf(staker));
        // console.log("the balance of staked tokens is", await staking.balanceLPOf(staker));

        // const getReward = staking.connect(staker).getReward();
        // await expect(getReward).to.changeTokenBalances(stakingToken, [staker, staking], [tokenNativeAmount, -tokenNativeAmount]);    
        // console.log(await rewardToken.balanceOf(staker));
    })
}