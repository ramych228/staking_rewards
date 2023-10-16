import { complexScenario } from './complexScenario'
import { decreasingStakes } from './decreasingStakes'
import { increasingStakes } from './increasingStakes'
import { lotsOfStakers } from './lotsOfStakers'
import { oneStaker } from './oneStaker/_'

export const scenarios = function () {
	/* --- one staker --- */

	describe('one staker', oneStaker)

	it.skip('complex scenario', complexScenario)

	it.skip('decreasing stakes', decreasingStakes)
	it.skip('increasing stakes', increasingStakes)
	it.skip('lots of stakers', lotsOfStakers)
}
