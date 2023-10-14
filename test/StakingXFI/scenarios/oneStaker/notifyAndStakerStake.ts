import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

export const notifyAndStakerStake = function () {
	it('Staker stake before notify reward', async function () {
        const { signers, staking, rewardToken } = await getStakingContractWithStakers()
        const staker = signers[0];
        const tokenRewardAmount = ethers.parseEther("1");

        await staking.connect(staker).stake(tokenRewardAmount / 10n);
        await staking.notifyTokenRewardAmount(tokenRewardAmount);

        await time.increaseTo(await staking.tokenPeriodFinish() + 1n);
        
        console.log(await staking.balanceSTOf(staker));
    })
}