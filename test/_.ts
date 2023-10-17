import { fixtures } from './_.fixtures'
import { exit } from './exit'
import { getReward } from './getReward'
import { notifyTokenRewardAmount } from './notifyTokenRewardAmount'
import { scenarios } from './scenarios/_'
import { stake } from './stake'
import { updateReward } from './updateReward'
import { withdraw } from './withdraw'
import { bonusPoints } from './bonusPoints'
import { notifyNativeRewardAmount } from './notifyNativeRewardAmount'
import { vest } from './vest'
import { getNativeReward } from './getNativeReward'

describe('StakingXFI', function () {
	/* --- Fixtures --- */

	describe('fixtures', fixtures)

	/* --- View functions --- */

	describe('Bonus Points', bonusPoints)

	/* --- Mutable functions --- */

	describe('stake', stake)
	describe('withdraw', withdraw)
	describe('getReward', getReward)
	describe('getNativeReward', getNativeReward)
	describe('exit', exit)
	describe('vest', vest)
	describe('notifyTokenRewardAmount', notifyTokenRewardAmount)
	describe('notifyNativeRewardAmount', notifyNativeRewardAmount)

	/* --- Modifier --- */

	describe('updateReward', updateReward)

	/* --- Modified ERC20 Logic --- */

	describe('totalSupply', async function () {
		// changes on stake/unstake
	})
	describe('transfer', async function () {
		// non-trasferable
	})
	describe('transferFrom', async function () {})
	describe('allowance', async function () {
		// non-trasferable
	})

	/* --- Scenarios --- */

	describe('scenarios', scenarios)
})
