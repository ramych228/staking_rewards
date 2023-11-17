import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-tracer'

import dotenv from 'dotenv'
dotenv.config()

const config: HardhatUserConfig = {
	solidity: {
		version: '0.8.19',
		settings: {
			optimizer: {
				enabled: true,
				runs: 1000,
			},
		},
	},
	networks: {
		xfi: {
			url: 'https://rpc.testnet.ms',
			chainId: 4157,
			accounts: ['353e9b9b76feeed8bd233c57a06ff900fdd8f20c0ce699fe01dff60fb9ede759'],
		},
	},
	gasReporter: {
		enabled: true,
		currency: 'USD',
		gasPrice: 30,
		coinmarketcap: process.env.COINMARKETCAP,
	},
	etherscan: {
		apiKey: {
			xfi: 'no-key',
		},
		customChains: [
			{
				network: 'xfi',
				chainId: 4157,
				urls: {
					apiURL: 'https://scan.testnet.ms/api',
					browserURL: 'https://scan.testnet.ms/',
				},
			},
		],
	},
}

export default config
