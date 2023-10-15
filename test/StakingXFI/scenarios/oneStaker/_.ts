import { notifyAndStakerStake } from './notifyAndStakerStake'

export const oneStaker = function () {
	it('staking before notifyToken and getting all the reward', notifyAndStakerStake)
}
