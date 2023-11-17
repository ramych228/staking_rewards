import { ethers } from 'hardhat'
import { ERC20Mintable, Staking } from '../typechain-types'

async function main() {
	const Staking = await ethers.getContractFactory('Staking')
	const WETH = await ethers.getContractFactory('ERC20Mintable')
	const signers = await ethers.getSigners()
	const deployer = signers[0]
	console.log(deployer.address)

	const rewardsTokenAddr = '0x74f4B6c7F7F518202231b58CE6e8736DF6B50A81'
	const stakingTokenAddr = '0xB867C7a3e18deb63964AF56bF0770c20Fe4d80df'
	const stakingAddr = '0xd2520Ff0B35B7bfaf15a271ccc5d3C55102BB886'
	// const stakingTokenAddr = '0xB867C7a3e18deb63964AF56bF0770c20Fe4d80df'

	// const weth = WETH.attach(rewardsTokenAddr) as ERC20Mintable
	// await weth.mint('0xf58941E4258320D76BdAb72C5eD8d47c25604e94', BigInt(1e24))
	// await weth.transfer(stakingAddr, BigInt(1e24))

	// console.log('Send WETH')

	const staking = Staking.attach(stakingAddr) as Staking

	await staking.notifyTokenRewardAmount(BigInt(1e24))
	console.log('Notified contract about Token rewards')

	await staking.notifyNativeRewardAmount(BigInt(1e19), { value: BigInt(1e19) })
	console.log('Notified contract about Native rewards')
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error)
		process.exit(1)
	})
