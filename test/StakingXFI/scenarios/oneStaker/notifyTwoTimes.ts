import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ethers } from 'hardhat'
import { getStakingContractWithStakers } from '../../_.fixtures'
import { expect } from 'chai'
import { sign } from 'crypto'

export const notifyTwoTimes = function () {
    it("notify 1 and after X secs notify 2", async function(){
        const { signers, staking, rewardToken, stakingToken } = await getStakingContractWithStakers()
        const staker = signers[1];
        const tokenRewardAmount = ethers.parseEther("1");
        

    })
}