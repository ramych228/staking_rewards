import { ethers } from 'hardhat'

async function main() {
	const ERC20 = await ethers.getContractFactory('ERC20Mintable')

	const weth = await ERC20.deploy('Wrapped Ether', 'WETH')

	await weth.waitForDeployment()

	console.log('WETH deployed at:', await weth.getAddress())
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.log(error)
		process.exit(1)
	})
