import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

export const stakeWithdrawStake = async function () {
    it("stake before notify, withdraw X tokens in the middle of reward duration", async function () {
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const stakeAmount = ethers.parseEther("100");
        const tokenRewardAmount = ethers.parseEther("10");
        
        // ----------- ACTION ---------------

        // FIRST STAKE
        await staking.connect(staker).stake(stakeAmount);
        await staking.notifyTokenRewardAmount(tokenRewardAmount);

        await time.increaseTo(await staking.tokenPeriodFinish() - ((duration / 2n) + 1n));

        const balanceChange = tokenRewardAmount / 2n;
        await expect(staking.connect(staker).getReward()).to.changeTokenBalances(rewardToken, [staker, staking], [balanceChange, -balanceChange]);
            
        // WITHDRAWING COUPLE TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
        for (let i = 0; i < 10; i++) { // was 100
            await staking.connect(staker).withdraw(stakeAmount / 200n);
            // console.log(await staking.balanceLPOf(staker));
        }
        await staking.connect(staker).withdraw(stakeAmount / 20n);
        await time.increaseTo(await staking.tokenPeriodFinish() + 1000000n);
        await staking.connect(staker).getReward();

        expect(await rewardToken.balanceOf(staker)).to.approximately(tokenRewardAmount, 100n);
    })

    it("stake after notify, withdraw X tokens in the middle of reward duration", async function () {
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const stakeAmount = ethers.parseEther("100");
        const tokenRewardAmount = ethers.parseEther("10");
        
        // ----------- ACTION ---------------

        await staking.notifyTokenRewardAmount(tokenRewardAmount);
        // FIRST STAKE
        await staking.connect(staker).stake(stakeAmount);

        await time.increaseTo(await staking.tokenPeriodFinish() - ((duration / 2n) + 1n));

        const balanceChange = tokenRewardAmount / 2n - (tokenRewardAmount / duration);
        await expect(staking.connect(staker).getReward()).to.changeTokenBalances(rewardToken, [staker, staking], [balanceChange, -balanceChange]);
            
        // WITHDRAWING COUPLE TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
        for (let i = 0; i < 10; i++) { // was 100
            await staking.connect(staker).withdraw(stakeAmount / 200n);
            // console.log(await staking.balanceLPOf(staker));
        }
        await staking.connect(staker).withdraw(stakeAmount / 20n);
        await time.increaseTo(await staking.tokenPeriodFinish() + 1000000n);
        await staking.connect(staker).getReward();

        expect(await rewardToken.balanceOf(staker)).to.approximately(tokenRewardAmount - (tokenRewardAmount / duration), 100n);
    })

    it("stake in the middle of reward duration after notify, withdraw X tokens in the middle", async function () {
        const { signers, staking, rewardToken, stakingToken, duration } = await getStakingContractWithStakers()
        const staker = signers[1];
        const stakeAmount = ethers.parseEther("100");
        const tokenRewardAmount = ethers.parseEther("10");
        
        // ----------- ACTION ---------------

        await staking.notifyTokenRewardAmount(tokenRewardAmount);

        await time.increaseTo(await staking.tokenPeriodFinish() - ((duration / 2n) + 1n));
        // FIRST STAKE
        await staking.connect(staker).stake(stakeAmount);

        const balanceChange = tokenRewardAmount / duration; // tokenRewardAmount / 2n - (tokenRewardAmount / duration);
        await expect(staking.connect(staker).getReward()).to.changeTokenBalances(rewardToken, [staker, staking], [balanceChange, -balanceChange]);
            
        // WITHDRAWING COUPLE TIMES OF THE STAKED BALANCE & INC. TIME TO DURATION END
        for (let i = 0; i < 10; i++) { // was 100
            await staking.connect(staker).withdraw(stakeAmount / 200n);
            // console.log(await staking.balanceLPOf(staker));
        }
        await staking.connect(staker).withdraw(stakeAmount / 20n);
        await time.increaseTo(await staking.tokenPeriodFinish() + 1000000n);
        await staking.connect(staker).getReward();

        expect(await rewardToken.balanceOf(staker)).to.approximately(tokenRewardAmount / 2n, 100n);
    })
}