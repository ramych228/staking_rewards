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
import { LST } from './lst'

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

	describe.only('LST', LST)

	/* --- Modifier --- */

	describe('updateReward', updateReward)

	/* --- Scenarios --- */

	describe('scenarios', scenarios)
})
