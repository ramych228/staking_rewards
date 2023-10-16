import { fixtures } from './_.fixtures'
import { bonusPointsEarned } from './bonusPointsEarned'
import { bonusPointsEarnedTotally } from './bonusPointsEarnedTotally'
import { tokenEarned } from './tokenEarned'
import { exit } from './exit'
import { getReward } from './getReward'
import { getRewardForDuration } from './getRewardForDuration'
import { lastTimeRewardApplicable } from './lastTimeRewardApplicable'
import { notifyTokenRewardAmount } from './notifyTokenRewardAmount'
import { rewardPerToken } from './rewardPerToken'
import { scenarios } from './scenarios/_'
import { stake } from './stake'
import { updateReward } from './updateReward'
import { withdraw } from './withdraw'

describe.only('StakingXFI', function () {
	/* --- Fixtures --- */

	// describe('fixtures', fixtures)

	// /* --- Basic StakingRewards --- */

	// /* --- View functions --- */

	// describe.skip('rewardPerToken', rewardPerToken)
	// describe('tokenEarned', tokenEarned)
	// describe('bonusPointsEarned', bonusPointsEarned)
	// describe.skip('bonusPointsEarnedTotally', bonusPointsEarnedTotally)


	// describe('getRewardForDuration', getRewardForDuration)
	// describe('lastTimeRewardApplicable', lastTimeRewardApplicable)

	// /* --- Mutable functions --- */

	// describe('stake', stake)
	// describe('withdraw', withdraw)
	// describe('getReward', getReward)
	// describe('exit', exit)
	// describe('notifyTokenRewardAmount', notifyTokenRewardAmount)

	// /* --- Modifier --- */

	// describe('updateReward', updateReward)

	// /* --- Modified ERC20 Logic --- */

	// describe('totalSupply', async function () {
	// 	// changes on stake/unstake
	// })
	// describe('transfer', async function () {
	// 	// non-trasferable
	// })
	// describe('transferFrom', async function () {})
	// describe('allowance', async function () {
	// 	// non-trasferable
	// })

	/* --- Scenarios --- */

	describe('scenarios', scenarios)
})
