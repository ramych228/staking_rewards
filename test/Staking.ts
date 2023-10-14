import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Token, Staking } from "../typechain-types";

describe("StakingRewards", function () {
  async function deploy60daysStakingRewardsFixture() {
      const [owner, staker1, staker2, staker3] = await ethers.getSigners();

      const Token = await ethers.getContractFactory("Token");
      const Staking = await ethers.getContractFactory("Staking");

      const deployedStakingToken = await Token.deploy("stakingToken", "STKN") as Token;
      const deployedRewardToken = await Token.deploy("rewardToken", "RTKN") as Token;


      const deployedStaking = await Staking.deploy(await owner.getAddress(),
          await deployedRewardToken.getAddress(),
          await deployedStakingToken.getAddress()) as Staking;


      // await deployedRewardToken.mint(await deployedStaking.getAddress(), 10000000);

      const AMOUNT_MULTIPLIER = await deployedStaking._AMOUNT_MULTIPLIER();
      const stakers = [staker1, staker2, staker3];
      for (let staker of stakers) {
          const stakerBalance = ethers.parseEther("10");
          await deployedStakingToken.mint(staker.address, stakerBalance);
          await deployedStakingToken.connect(staker).approve(await deployedStaking.getAddress(), stakerBalance / 10n);
      }

      return { deployedStaking, deployedStakingToken, deployedRewardToken, owner, staker1, staker2, staker3, AMOUNT_MULTIPLIER };
  }

  async function notifyNativeRewardAmountStaking() {
      const { deployedStaking } = await loadFixture(deploy60daysStakingRewardsFixture);
      const reward = ethers.parseEther("1");
      const duration = 50;

      await deployedStaking.notifyNativeRewardAmount(reward, {value: reward});
      return { reward, duration };
  }

  async function notifyTokenRewardAmountStaking() {
      const { deployedStaking, deployedRewardToken } = await loadFixture(deploy60daysStakingRewardsFixture);
      const reward = 100;

      await deployedRewardToken.mint(await deployedStaking.getAddress(), reward); // mint reward tokens
      await deployedStaking.notifyTokenRewardAmount(reward);
      return { reward };
  }

  describe("Simulation", function () {

      // it("Native Staking", async function () {
      //     const { staker1, staker2, deployedStaking } = await loadFixture(deploy60daysStakingRewardsFixture);
      //     const {} = await loadFixture(notifyNativeRewardAmountStaking);

      //     await deployedStaking.connect(staker1).stake(10);

      //     time.increaseTo((await deployedStaking._nativePeriodFinish()) - 25n);

      //     await deployedStaking.connect(staker2).stake(10);

      //     time.increaseTo((await deployedStaking._nativePeriodFinish()));

      //     await deployedStaking.connect(staker1).vest(1);
      //     await deployedStaking.connect(staker2).vest(1);
          
      // })

      it("Token Staking", async function () {
          const { staker1, staker2, deployedStaking } = await loadFixture(deploy60daysStakingRewardsFixture);
          const {} = await loadFixture(notifyTokenRewardAmountStaking);

          console.log("await deployedStaking.connect(staker1).stake(10);");
          await deployedStaking.connect(staker1).stake(10);

          time.increaseTo((await deployedStaking._tokenPeriodFinish()) - 25n);

          console.log("await deployedStaking.connect(staker2).stake(10);");
          await deployedStaking.connect(staker2).stake(10);

          time.increaseTo((await deployedStaking._tokenPeriodFinish()));

          await deployedStaking.connect(staker1).getReward();
          await deployedStaking.connect(staker2).getReward();
          
      })
  })

  describe("Basic Tests", function (){
    describe("Stake tests", function (){
      it("Balance after stake", async function () {
        const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);

        await deployedStaking.connect(staker1).stake(10);
        expect(await deployedStaking.balanceLPOf(staker1)).to.equal(10);
      })

      it("Balance after stake and unstake", async function () {
        const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);

        await deployedStaking.connect(staker1).stake(ethers.parseEther("0.5"));
        
        await time.increaseTo(await deployedStaking._nativePeriodFinish() + 100n);

        await deployedStaking.connect(staker1).withdraw(ethers.parseEther("0.5"));

        expect(await deployedStaking.balanceLPOf(staker1)).to.be.approximately(0, 1000);
      })

      it("Balance of random staker after staker1 stake", async function () {
        const {deployedStaking, staker1, staker2} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);

        await deployedStaking.connect(staker1).stake(10);
        expect(await deployedStaking.balanceLPOf(staker2)).to.equal(0);
      })

      it("Trying to stake more then staker allowance", async function () {
        const {deployedStaking,deployedStakingToken, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);

        await expect(deployedStaking.connect(staker1).stake(await deployedStakingToken.allowance(staker1, deployedStaking) + 1n)).to.be.revertedWith('ERC20: insufficient allowance');
      })

      it("Trying to stake 0 tokens", async function () {
        const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);

        await expect(deployedStaking.connect(staker1).stake(0)).to.be.revertedWith('Cannot stake 0');
      })
    })

    describe("withdraw tests", function () {
      it("Unstaking negative number of tokens", async function () {
        const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);

        await deployedStaking.connect(staker1).stake(10);
        expect(deployedStaking.connect(staker1).withdraw(-5)).to.be.reverted;
      })

      it("Unstaking more tokens then staked", async function () {
        const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);

        await deployedStaking.connect(staker1).stake(ethers.parseEther("0.1"));
        await expect(deployedStaking.connect(staker1).withdraw(ethers.parseEther("0.8"))).to.be.reverted;
      })

      it("Unstaking more tokens, despite nothing were staked", async function () {
        const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
        const {} = await loadFixture(notifyNativeRewardAmountStaking);
        await expect(deployedStaking.connect(staker1).withdraw(10)).to.be.reverted;
      })
    })

    describe("Reward Amount", function () {
      // TODO: Check too high reward
      it("Should set the right reward amount", async function () {
        const { deployedStaking, deployedStakingToken } = await loadFixture(deploy60daysStakingRewardsFixture);
        const { reward } = await loadFixture(notifyNativeRewardAmountStaking);
  
        expect(await ethers.provider.getBalance(await deployedStaking.getAddress())).to.equal(reward);
      });
    });

    describe("Reward Duration", function () {
      it("Check variables for duration 50 sec", async function () {
        const { deployedStaking, AMOUNT_MULTIPLIER} = await loadFixture(deploy60daysStakingRewardsFixture);
        const { reward, duration } = await loadFixture(notifyNativeRewardAmountStaking);
  
        const periodFinish = (await time.latest()) + 50;
  
        expect((await deployedStaking._nativePeriodFinish()) - (await deployedStaking._lastUpdateTime())).to.equal(50);
        expect(await deployedStaking._nativePeriodFinish()).to.equal(periodFinish);
        expect(await deployedStaking._nativeRewardRate()).to.equal((reward / BigInt(duration)) * AMOUNT_MULTIPLIER);
      })
    })

    describe("exit", function () {
      it("staker exit right after stake", async function () {
        const { deployedStaking, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
        const { } = await loadFixture(notifyNativeRewardAmountStaking);

        await deployedStaking.connect(staker1).stake(ethers.parseEther("0.01"));
        await deployedStaking.connect(staker1).exit();
        expect(await deployedStaking.balanceLPOf(staker1)).to.be.equals(0);
      })
    })

    describe("notifyReward", function () {
      it("calling notifyReward NOT from MATIVE rewardDistribution", async function () {
        const { deployedStaking, deployedStakingToken, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
        const reward = 100;

        await deployedStakingToken.mint(await deployedStaking.getAddress(), reward); // mint reward tokens
        await expect(deployedStaking.connect(staker1).notifyNativeRewardAmount(reward)).to.be.revertedWith('Caller is not RewardsDistribution contract');
      })

      it("calling notifyReward NOT from REWARD rewardDistribution", async function () {
        const { deployedStaking, deployedStakingToken, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
        const reward = 100;

        await deployedStakingToken.mint(await deployedStaking.getAddress(), reward); // mint reward tokens
        await expect(deployedStaking.connect(staker1).notifyTokenRewardAmount(reward)).to.be.revertedWith('Caller is not RewardsDistribution contract');
      })
    })

    describe("lastTimeRewardApplicable", function (){
      it("checking lastTimeRewardApplicable after period finish", async function () {
        const { deployedStaking, deployedRewardToken, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
        const { } = await loadFixture(notifyNativeRewardAmountStaking);
        
        const periodFinish = (await time.latest()) + 50;
        await time.increaseTo(await time.latest() + 100);

        expect(await deployedStaking.lastTimeRewardApplicable()).to.equals(periodFinish);
      })

      it("checking lastTimeRewardApplicable before period finish", async function () {
        const { deployedStaking, deployedRewardToken, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
        const { } = await loadFixture(notifyNativeRewardAmountStaking);
        
        await time.increaseTo(await time.latest() + 20);
        const currentTime = await time.latest();

        expect(await deployedStaking.lastTimeRewardApplicable()).to.equals(currentTime);
      })
    })

    describe("RewardRate", function (){
      it("checking rewards rate", async function (){
        const { deployedStaking, AMOUNT_MULTIPLIER } = await loadFixture(deploy60daysStakingRewardsFixture);
        const {reward, duration } = await loadFixture(notifyNativeRewardAmountStaking);

        expect(await deployedStaking._nativeRewardRate()).to.equals((reward / BigInt(duration)) * AMOUNT_MULTIPLIER);
      })
    })

    // describe("vesting", function () {

    // })
});

describe("Corner Cases", function() {
  describe("big numbers", function (){
    // it("Big Reward", async function (){
    //   it("checking rewards rate", async function (){
    //     const { deployedStaking, AMOUNT_MULTIPLIER } = await loadFixture(deploy60daysStakingRewardsFixture);
    //     const {reward, duration } = await loadFixture(notifyNativeRewardAmountStaking);

    //     expect(await deployedStaking._rewardRate()).to.equals((reward / duration) * AMOUNT_MULTIPLIER);
    //   })
    // })
  })
})    
  
describe("Different Scenarios", function (){
    describe("One Staker", function (){
      it("Staking in the beginning and taking all reward", async function (){
        const { deployedStaking, staker1, AMOUNT_MULTIPLIER } = await loadFixture(deploy60daysStakingRewardsFixture);
        const { reward } = await loadFixture(notifyNativeRewardAmountStaking);

        const stakeAmount = ethers.parseEther("1");
        await deployedStaking.connect(staker1).stake(stakeAmount);

        await time.increaseTo(await deployedStaking._nativePeriodFinish() + 10n);

        await deployedStaking.connect(staker1).vest(0);

        console.log(reward);
        console.log(await deployedStaking.balanceLPOf(staker1));
        console.log(await deployedStaking.balanceSTOf(staker1));

        expect(await deployedStaking.balanceLPOf(staker1)).to.equals(stakeAmount);
        // expect(await deployedStaking.balanceSTOf(staker1)).to.equals(reward); TODO: appr
      })
    })

    describe("Two Stakers", function (){
      it("Stakers get reward by half", async function (){
        const { deployedStaking, staker1, staker2, AMOUNT_MULTIPLIER } = await loadFixture(deploy60daysStakingRewardsFixture);
        const {reward, duration } = await loadFixture(notifyNativeRewardAmountStaking);

        const stakeAmount = ethers.parseEther("0.1");
        await deployedStaking.connect(staker1).stake(stakeAmount);

        await time.increaseTo(await deployedStaking._nativePeriodFinish() - 25n);

        await deployedStaking.connect(staker1).vest(0);
        
        console.log(await deployedStaking.balanceLPOf(staker1));
        console.log(await deployedStaking.balanceSTOf(staker1));
        expect(await deployedStaking.balanceLPOf(staker1) + await deployedStaking.balanceSTOf(staker1)).to.equals(ethers.parseEther("0.6"));

        await deployedStaking.connect(staker2).stake(ethers.parseEther("0.6"));

        await time.increaseTo(await deployedStaking._nativePeriodFinish() + 10n);

        await deployedStaking.connect(staker1).vest(0);
        await deployedStaking.connect(staker2).vest(0);

        console.log(await deployedStaking.balanceLPOf(staker2));
        console.log(await deployedStaking.balanceSTOf(staker2));

        expect(await deployedStaking.balanceLPOf(staker1) + await deployedStaking.balanceSTOf(staker1)).to.equals(ethers.parseEther("0.85"));
        expect(await deployedStaking.balanceLPOf(staker2) + await deployedStaking.balanceSTOf(staker2)).to.equals(ethers.parseEther("0.85"));
      })
    })
})

});