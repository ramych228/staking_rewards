import { ethers } from 'hardhat'
import { ERC20Mintable__factory } from '../../typechain-types'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'

export const fixtures = function () {
	it('getStakingContract', async function () {
		const { rewardToken, staking, stakingToken } = await getStakingContracts()

		expect(await rewardToken.name()).to.be.eq('Reward Token')
		expect(await rewardToken.symbol()).to.be.eq('RWRD')

		expect(await stakingToken.name()).to.be.eq('Staking Token')
		expect(await stakingToken.symbol()).to.be.eq('STKNG')

		expect(await staking.name()).to.be.eq('Staked Staking Token')
		expect(await staking.symbol()).to.be.eq('SSTKNG')
	})

	it('getStakingContractWithStakersAndRewards', async function () {
		const { rewardToken, staking, stakingToken, signers, owner } = await getStakingContractsWithStakersAndRewards()

		expect(owner.address).to.be.eq(signers[0].address)
		const totalSupply = await stakingToken.totalSupply()
		expect(totalSupply).to.be.eq(ethers.parseEther('300'))

		expect(await staking.balanceOf(signers[1].address)).to.be.eq(ethers.parseEther('1'))
		expect(await staking.balanceOf(signers[2].address)).to.be.eq(ethers.parseEther('2'))
		expect(await staking.balanceOf(signers[3].address)).to.be.eq(ethers.parseEther('3'))

		expect(await stakingToken.balanceOf(await staking.getAddress())).to.be.eq(ethers.parseEther('6'))
		expect(await rewardToken.balanceOf(await staking.getAddress())).to.be.eq(ethers.parseEther('100'))

		expect(await stakingToken.balanceOf(signers[1].address)).to.be.eq(ethers.parseEther('99'))
		expect(await stakingToken.balanceOf(signers[2].address)).to.be.eq(ethers.parseEther('98'))
		expect(await stakingToken.balanceOf(signers[3].address)).to.be.eq(ethers.parseEther('97'))

		const stakedTotalSupply = await staking.totalSupply()
		expect(stakedTotalSupply).to.be.eq(ethers.parseEther('6'))
	})
}

async function deployStaking() {
	const ERC20 = (await ethers.getContractFactory('ERC20Mintable')) as ERC20Mintable__factory
	const rewardToken = await ERC20.deploy('Reward Token', 'RWRD')
	const stakingToken = await ERC20.deploy('Staking Token', 'STKNG')

	const StakingRewards = await ethers.getContractFactory('StakingXFI')
	const staking = await StakingRewards.deploy(
		'Staked ' + (await stakingToken.name()),
		'S' + (await stakingToken.symbol()),
		await rewardToken.getAddress(),
		await stakingToken.getAddress()
	)

	const signers = await ethers.getSigners()
	const owner = signers[0]

	return {
		rewardToken,
		stakingToken,
		staking,
		signers,
		owner,
	}
}

async function deployStakingWithStakersAndRewards() {
	const { rewardToken, stakingToken, staking, signers, owner } = await loadFixture(deployStaking)

	const amount = ethers.parseEther('100')

	await rewardToken.mint(await staking.getAddress(), amount)
	await rewardToken.mint(owner.address, amount)

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

export async function getStakingContracts() {
	return loadFixture(deployStaking)
}

export async function getStakingContractsWithStakersAndRewards() {
	return loadFixture(deployStakingWithStakersAndRewards)
}
