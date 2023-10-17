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
	gasReporter: {
		enabled: true,
		currency: 'USD',
		gasPrice: 30,
		coinmarketcap: process.env.COINMARKETCAP,
	},
}

export default config
