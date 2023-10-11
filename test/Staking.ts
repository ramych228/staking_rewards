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

        const stakers = [staker1, staker2, staker3];
        for (let staker of stakers) {
            const stakerBalance = 10_000;
            await deployedStakingToken.mint(staker.address, stakerBalance);
            await deployedStakingToken.connect(staker).approve(await deployedStaking.getAddress(), stakerBalance / 10);
        }

        return { deployedStaking, deployedStakingToken, deployedRewardToken, owner, staker1, staker2, staker3 };
    }

    async function notifyNativeRewardAmountStaking() {
        const { deployedStaking, deployedRewardToken } = await loadFixture(deploy60daysStakingRewardsFixture);
        const reward = 100;

        // console.log("transfering 100 reward tokens to stakingRewards contract and then calling notifyRewardAmount");
        
        // await deployedRewardToken.mint(await deployedStaking.getAddress(), reward); // mint reward tokens
        await deployedStaking.notifyNativeRewardAmount(reward, {value: 100});
        return { reward };
    }

    async function notifyTokenRewardAmountStaking() {
        const { deployedStaking, deployedRewardToken } = await loadFixture(deploy60daysStakingRewardsFixture);
        const reward = 100;

        // console.log("transfering 100 reward tokens to stakingRewards contract and then calling notifyRewardAmount");
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

    /*
    describe("Basic Tests", function (){
        describe("Stake tests", function (){
          it("Balance after stake", async function () {
            const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
            const {} = await loadFixture(notifyNativeRewardAmountStaking);
    
            await deployedStaking.connect(staker1).stake(10);
            expect(await deployedStaking.balanceOf(staker1)).to.equal(10);
          })
    
          it("Balance after stake and unstake", async function () {
            const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
            const {} = await loadFixture(notifyNativeRewardAmountStaking);
    
            await deployedStaking.connect(staker1).stake(10);
            await deployedStaking.connect(staker1).withdraw(10);
            expect(await deployedStaking.balanceOf(staker1)).to.equal(0);
          })
    
          it("Balance of random staker after staker1 stake", async function () {
            const {deployedStaking, staker1, staker2} = await loadFixture(deploy60daysStakingRewardsFixture);
            const {} = await loadFixture(notifyNativeRewardAmountStaking);
    
            await deployedStaking.connect(staker1).stake(10);
            expect(await deployedStaking.balanceOf(staker2)).to.equal(0);
          })
    
          it("Trying to stake more then staker allowance", async function () {
            const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
            const {} = await loadFixture(notifyNativeRewardAmountStaking);
    
            await expect(deployedStaking.connect(staker1).stake(1_001)).to.be.revertedWith('ERC20: insufficient allowance');
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
    
            await deployedStaking.connect(staker1).stake(1);
            await expect(deployedStaking.connect(staker1).withdraw(10)).to.be.reverted;
          })
    
          it("Unstaking more tokens, despite nothing were staked", async function () {
            const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
            const {} = await loadFixture(notifyNativeRewardAmountStaking);
            await expect(deployedStaking.connect(staker1).withdraw(10)).to.be.reverted;
          })
        })
  
        describe("TottalSupply", function (){
          it("TotalSupple changes after stake and withdraw", async function(){
            const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
            const {} = await loadFixture(notifyNativeRewardAmountStaking);
  
            expect(await deployedStaking.totalSupply()).to.equal(0);
            await deployedStaking.connect(staker1).stake(10);
            expect(await deployedStaking.totalSupply()).to.equal(10);
            await deployedStaking.connect(staker1).withdraw(5);
            expect(await deployedStaking.totalSupply()).to.equal(5);
          })
  
          it("TotalSupple after incorrect withdraw", async function(){
            const {deployedStaking, staker1} = await loadFixture(deploy60daysStakingRewardsFixture);
            const {} = await loadFixture(notifyNativeRewardAmountStaking);
  
            expect(await deployedStaking.totalSupply()).to.equal(0);
            await deployedStaking.connect(staker1).stake(10);
            expect(await deployedStaking.totalSupply()).to.equal(10);
            expect(deployedStaking.connect(staker1).withdraw(15)).to.be.reverted;
            expect(await deployedStaking.totalSupply()).to.equal(10);
          })
        })
  
        describe("Reward Amount", function () {
          it("Should set the right reward amount", async function () {
            const { deployedStaking, deployedRewardToken } = await loadFixture(deploy60daysStakingRewardsFixture);
            const { reward } = await loadFixture(notifyNativeRewardAmountStaking);
          
            expect(await deployedRewardToken.balanceOf(await deployedStaking.getAddress())).to.equal(reward);
          });
        });
  
        describe("Reward Duration", function () {
          it("Check variables state after 50 sec", async function () {
            const { deployedStaking } = await loadFixture(deploy60daysStakingRewardsFixture);
            const { } = await loadFixture(notifyNativeRewardAmountStaking);
      
            const periodFinish = (await time.latest()) + 50;
      
            expect((await deployedStaking._periodFinish()) - (await deployedStaking._lastUpdateTime())).to.equal(50);
            expect(await deployedStaking._periodFinish()).to.equal(periodFinish);
            expect(await deployedStaking._rewardRate()).to.equal(2);
          })
        })
  
        describe("exit", function () {
          it("staker exit right after stake", async function () {
            const { deployedStaking, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
            const { } = await loadFixture(notifyNativeRewardAmountStaking);
  
            await deployedStaking.connect(staker1).stake(10);
            await deployedStaking.connect(staker1).exit();
            expect(await deployedStaking.balanceOf(staker1)).to.equal(0);
          })
        })
  
        describe("notifyReward", function () {
          it("calling notifyReward NOT from rewardDistribution", async function () {
            const { deployedStaking, deployedRewardToken, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
            const reward = 100;
  
            await deployedRewardToken.mint(await deployedStaking.getAddress(), reward); // mint reward tokens
            await expect(deployedStaking.connect(staker1).notifyRewardAmount(reward)).to.be.revertedWith('Caller is not RewardsDistribution contract');
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
            const { deployedStaking, deployedRewardToken, staker1 } = await loadFixture(deploy60daysStakingRewardsFixture);
            const { } = await loadFixture(notifyNativeRewardAmountStaking);
  
            expect(await deployedStaking._rewardRate()).to.equals(2);
          })
        })
  
        // describe("vesting", function () {
  
        // })
    });
  
    describe("Different Scenarios", function (){
  
    })
  
    // describe("Staking", function () {
    //   it("Check staker balance in staking tokens", async function () {
    //     const { deployedStaking, deployedStakingToken, staker1, staker2, staker3 } = await loadFixture(deploy60daysStakingRewardsFixture);
    //     const { reward } = await loadFixture(notifyNativeRewardAmountStaking);
  
    //     console.log("staker1 staking 10 tokens");
    //     await deployedStaking.connect(staker1).stake(10);
        
    //     expect(await deployedStaking._rewardPerTokenStored()).to.equal(0);
    //     expect(await deployedStaking._rewards(staker1.address)).to.equal(0);
    //     expect(await deployedStaking._userRewardPerTokenPaid(staker1.address)).to.equal(0);
    //     // expect((await deployedStaking._periodFinish()) - (await deployedStaking._lastUpdateTime())).to.equal(49);
        
    //     await time.increaseTo(await deployedStaking._periodFinish() - 25n);
        
    //     console.log("staker2 stating 15 tokens");
    //     await deployedStaking.connect(staker2).stake(15);
  
    //     // expect(await deployedStaking._time()).to.equal(await deployedStaking._periodFinish());
    //     //expect((await deployedStaking.lastTimeRewardApplicable()) -  await deployedStaking._lastUpdateTime()).to.equal(1);
    //     //expect(await deployedStaking._rewardRate()).to.equal(2);
    //     //expect(await deployedStaking.totalSupply()).to.equal(10);
        
    //     expect(await deployedStaking._rewardPerTokenStored()).to.equal(5000000000000000000n);
  
    //     console.log("staker3 staking 25 tokens");
    //     await deployedStaking.connect(staker3).stake(25);
  
    //     expect(await deployedStaking.rewardPerTokenStored()).to.equal(1);
    //   })
    // })
    */
    /*
    describe("Withdrawals", function () {
      describe("Validations", function () {
        it("Should revert with the right error if called too soon", async function () {
          const { lock } = await loadFixture(deployOneYearLockFixture);
  
          await expect(lock.withdraw()).to.be.revertedWith(
            "You can't withdraw yet"
          );
        });
  
        it("Should revert with the right error if called from another account", async function () {
          const { lock, unlockTime, otherAccount } = await loadFixture(
            deployOneYearLockFixture
          );
  
          // We can increase the time in Hardhat Network
          await time.increaseTo(unlockTime);
  
          // We use lock.connect() to send a transaction from another account
          await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
            "You aren't the owner"
          );
        });
  
        it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
          const { lock, unlockTime } = await loadFixture(
            deployOneYearLockFixture
          );
  
          // Transactions are sent using the first signer by default
          await time.increaseTo(unlockTime);
  
          await expect(lock.withdraw()).not.to.be.reverted;
        });
      });
  
      describe("Events", function () {
        it("Should emit an event on withdrawals", async function () {
          const { lock, unlockTime, lockedAmount } = await loadFixture(
            deployOneYearLockFixture
          );
  
          await time.increaseTo(unlockTime);
  
          await expect(lock.withdraw())
            .to.emit(lock, "Withdrawal")
            .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
        });
      });
  
      describe("Transfers", function () {
        it("Should transfer the funds to the owner", async function () {
          const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
            deployOneYearLockFixture
          );
  
          await time.increaseTo(unlockTime);
  
          await expect(lock.withdraw()).to.changeEtherBalances(
            [owner, lock],
            [lockedAmount, -lockedAmount]
          );
        });
      });
    });
    */
});
