import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'

async function deployStaking() {
	const ERC20 = await ethers.getContractFactory('ERC20Mintable')
	const rewardToken = await ERC20.deploy('Reward Token', 'RWRD')
	const stakingToken = await ERC20.deploy('Staking Token', 'STKNG')

	const signers = await ethers.getSigners()
	const owner = signers[0]
	const duration = 50n

	const StakingRewards = await ethers.getContractFactory('Staking')
	const staking = await StakingRewards.deploy(
		owner.address,
		await rewardToken.getAddress(),
		await stakingToken.getAddress()
	)

	return {
		rewardToken,
		stakingToken,
		staking,
		signers,
		owner,
		duration,
	}
}

async function deployStakingWithStakersAndRewards() {
	const { rewardToken, stakingToken, staking, signers, owner } = await loadFixture(deployStaking)

	let amount = ethers.parseEther('100')

	await rewardToken.mint(await staking.getAddress(), amount)
	await rewardToken.mint(owner.address, amount)

	amount = amount * 10n
	await stakingToken.mint(signers[1].address, amount)
	await stakingToken.mint(signers[2].address, amount)
	await stakingToken.mint(signers[3].address, amount)

	await stakingToken.connect(signers[1]).approve(await staking.getAddress(), amount)
	await stakingToken.connect(signers[2]).approve(await staking.getAddress(), amount)
	await stakingToken.connect(signers[3]).approve(await staking.getAddress(), amount)

	const stakeAmount = ethers.parseEther('1')
	await staking.connect(signers[1]).stake(stakeAmount)
	await staking.connect(signers[2]).stake(stakeAmount * 2n)
	await staking.connect(signers[3]).stake(stakeAmount * 3n)

	return {
		rewardToken,
		stakingToken,
		staking,
		owner,
		signers,
	}
}

async function deployStakingWithStakers() {
	const { rewardToken, stakingToken, staking, signers, owner, duration } = await loadFixture(deployStaking)

	const amount = ethers.parseEther('100')

	await rewardToken.mint(await staking.getAddress(), amount)
	await rewardToken.mint(owner.address, amount)

	await stakingToken.mint(signers[1].address, amount)
	await stakingToken.mint(signers[2].address, amount)
	await stakingToken.mint(signers[3].address, amount)

	await stakingToken.connect(signers[1]).approve(await staking.getAddress(), amount)
	await stakingToken.connect(signers[2]).approve(await staking.getAddress(), amount)
	await stakingToken.connect(signers[3]).approve(await staking.getAddress(), amount)

	return {
		rewardToken,
		stakingToken,
		staking,
		owner,
		signers,
		duration,
	}
}

export async function getStakingContracts() {
	return loadFixture(deployStaking)
}

export async function getStakingContractsWithStakersAndRewards() {
	return loadFixture(deployStakingWithStakersAndRewards)
}

export async function getStakingContractWithStakers() {
	return loadFixture(deployStakingWithStakers)
}

export const fixtures = function () {
	it('getStakingContract', async function () {
		const { rewardToken, stakingToken } = await getStakingContracts()

		expect(await rewardToken.name()).to.be.eq('Reward Token')
		expect(await rewardToken.symbol()).to.be.eq('RWRD')

		expect(await stakingToken.name()).to.be.eq('Staking Token')
		expect(await stakingToken.symbol()).to.be.eq('STKNG')

		// expect(await staking.name()).to.be.eq('Staked Staking Token')
		// expect(await staking.symbol()).to.be.eq('SSTKNG')
	})

	it('getStakingContractWithStakersAndRewards', async function () {
		const { rewardToken, staking, stakingToken, signers, owner } = await getStakingContractsWithStakersAndRewards()
		const AMOUNT_MULTIPLIER = await staking.AMOUNT_MULTIPLIER()

		expect(owner.address).to.be.eq(signers[0].address)
		const totalSupply = await stakingToken.totalSupply()
		expect(totalSupply).to.be.eq(ethers.parseEther('3000'))

		expect(await staking.balanceLPOf(signers[1].address)).to.be.eq(ethers.parseEther('1'))
		expect(await staking.balanceLPOf(signers[2].address)).to.be.eq(ethers.parseEther('2'))
		expect(await staking.balanceLPOf(signers[3].address)).to.be.eq(ethers.parseEther('3'))

		expect(await stakingToken.balanceOf(await staking.getAddress())).to.be.eq(ethers.parseEther('6'))
		expect(await rewardToken.balanceOf(await staking.getAddress())).to.be.eq(ethers.parseEther('100'))

		expect(await stakingToken.balanceOf(signers[1].address)).to.be.eq(ethers.parseEther('999'))
		expect(await stakingToken.balanceOf(signers[2].address)).to.be.eq(ethers.parseEther('998'))
		expect(await stakingToken.balanceOf(signers[3].address)).to.be.eq(ethers.parseEther('997'))

		const stakedTotalSupply = (await staking.totalSupplyLP()) / AMOUNT_MULTIPLIER
		expect(stakedTotalSupply).to.be.eq(ethers.parseEther('6'))
	})
}
