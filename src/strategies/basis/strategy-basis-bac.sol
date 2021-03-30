// SPDX-License-Identifier: MIT
pragma solidity ^0.6.7;

import "../strategy-basis-farm-base.sol";

contract StrategyBasisBac is StrategyBasisFarmBase {
    // Token addresses
    address public staking_pool = 0x7E7aE8923876955d6Dcb7285c04065A1B9d6ED8c; //needs to be updated
    address public bac = 0x3449FC1Cd036255BA1EB19d65fF4BA2b8903A69a;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _timelock
    )
        public
        StrategyBasisFarmBase(
            bac,
            staking_pool,
            bac,
            _governance,
            _strategist,
            _controller,
            _timelock
        )
    {}

    // **** Views ****

    function getName() external override pure returns (string memory) {
        return "StrategyBasisBac";
    }
}
