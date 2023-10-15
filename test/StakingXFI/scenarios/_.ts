import { complexScenario } from './complexScenario'
import { decreasingStakes } from './decreasingStakes'
import { increasingStakes } from './increasingStakes'
import { lotsOfStakers } from './lotsOfStakers'

export const scenarios = function () {
	it.only('complex scenario', complexScenario)
	it.skip('decreasing stakes', decreasingStakes)
	it.skip('increasing stakes', increasingStakes)
	it.skip('lots of stakers', lotsOfStakers)
}
