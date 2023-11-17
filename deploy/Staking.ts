import { ethers } from 'hardhat'

async function main() {
	const Staking = await ethers.getContractFactory('Staking')

	const rewardsTokenAddr = '0x74f4B6c7F7F518202231b58CE6e8736DF6B50A81'
	const stakingTokenAddr = '0xB867C7a3e18deb63964AF56bF0770c20Fe4d80df'

	const staking = await Staking.deploy(
		'0xf58941E4258320D76BdAb72C5eD8d47c25604e94',
		rewardsTokenAddr,
		stakingTokenAddr,
		'Staked LP XFI',
		'sLPXFI'
	)

	await staking.waitForDeployment()

	console.log('Staking deployed at:', await staking.getAddress())
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error)
		process.exit(1)
	})
