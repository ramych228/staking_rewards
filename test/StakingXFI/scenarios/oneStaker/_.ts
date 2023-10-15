import { notifyAndStakerStake } from './notifyAndStakerStake'
import { notifyTwoTimes } from './notifyTwoTimes';

export const oneStaker = function () {
	describe('Staking, Notify and getting all reward', notifyAndStakerStake);
	describe('Staking, and having two notifies at different times', notifyTwoTimes);
}
