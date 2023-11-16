import { getStakingContracts, getStakingContractsWithStakersAndRewards } from './_.fixtures'
import { expect } from 'chai'

export const LST = function () {
	it('Contract is ERC20 contract', async function () {
		const { staking } = await getStakingContracts()

		expect(await staking.name()).to.be.eq('Staked LP XFI')
		expect(await staking.symbol()).to.be.eq('sLPXFI')
	})

	it('Staked tokens are minted', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		expect(await staking.balanceOf(signers[1])).to.be.eq(BigInt(1e18))
		expect(await staking.balanceOf(signers[2])).to.be.eq(BigInt(2e18))
		expect(await staking.balanceOf(signers[3])).to.be.eq(BigInt(3e18))
	})

	it('Staked tokens are transferable', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		await staking.connect(signers[2]).transfer(signers[3].address, BigInt(1e18))
		expect(await staking.balanceOf(signers[2].address)).to.be.eq(BigInt(1e18))
		expect(await staking.balanceOf(signers[3].address)).to.be.eq(BigInt(4e18))
	})

	it('Staked tokens are burned on withdraw', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		await staking.connect(signers[1]).withdraw(BigInt(1e18))
		expect(await staking.balanceOf(signers[1].address)).to.be.eq(0)

		await staking.connect(signers[2]).withdraw(BigInt(2e18))
		expect(await staking.balanceOf(signers[2].address)).to.be.eq(0)

		await staking.connect(signers[3]).withdraw(BigInt(3e18))
		expect(await staking.balanceOf(signers[3].address)).to.be.eq(0)
	})

	it('Withdraw fails without staked tokens on balance', async function () {
		const { staking, signers } = await getStakingContractsWithStakersAndRewards()

		const withdraw = staking.connect(signers[1]).withdraw(BigInt(2e18))
		await expect(withdraw).to.be.revertedWith('No staked tokens on balance')
	})
}
