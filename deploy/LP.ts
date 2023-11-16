import { ethers } from 'hardhat'

async function main() {
	const ERC20 = await ethers.getContractFactory('ERC20Mintable')

	const lp = await ERC20.deploy('LP-XFI/WETH', 'LP-XFI/WETH')

	await lp.waitForDeployment()

	console.log('LP deployed at:', await lp.getAddress())
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error)
		process.exit(1)
	})
