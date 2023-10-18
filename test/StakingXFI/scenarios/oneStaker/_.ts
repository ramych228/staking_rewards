import { notifyAndStakerStake } from './notifyAndStakerStake'
import { notifyTwoTimes } from './notifyTwoTimes';
import { stakeWithdrawStake } from './stakeWithdrawStake';

export const oneStaker = function () {
	describe.skip('Staking, Notify and getting all reward', notifyAndStakerStake);
	describe('Staking, and having two notifies at different time', notifyTwoTimes);
	describe.skip('Staking, and Withdraw some tokens at different time', stakeWithdrawStake)
}
