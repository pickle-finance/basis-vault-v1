pragma solidity ^0.6.7;



import "../../lib/test-strategy-basis-farm-base.sol";

import "../../../interfaces/strategy.sol";
import "../../../interfaces/uniswapv2.sol";

import "../../../basis-vault.sol";
import "../../../controller-v4.sol";
import "../../../strategies/basis/strategy-basis-bac.sol";

contract StrategyBasisBacTest is StrategyBasisFarmTestBase {
    function setUp() public {
        want = 0x3449FC1Cd036255BA1EB19d65fF4BA2b8903A69a; //Basis cash
        token1 = 0x3449FC1Cd036255BA1EB19d65fF4BA2b8903A69a;

        governance = address(this);
        strategist = address(this);
        devfund = address(new User());
        treasury = address(new User());
        timelock = address(this);

        controller = new ControllerV4(
            governance,
            strategist,
            timelock,
            devfund,
            treasury
        );

        strategy = IStrategy(
            address(
                new StrategyBasisBac(
                    governance,
                    strategist,
                    address(controller),
                    timelock,
                    timelock,
                    timelock,
                    timelock
                )
            )
        );

        basisVault = new BasisVault(
            strategy.want(),
            governance,
            timelock,
            address(controller)
        );

        controller.setVault(strategy.want(), address(basisVault));
        controller.approveStrategy(strategy.want(), address(strategy));
        controller.setStrategy(strategy.want(), address(strategy));

        // Set time
        hevm.warp(startTime);
    }

    // **** Tests ****

    function test_bac_timelock() public {
        _test_timelock();
    }

    function test_bac_withdraw_release() public {
        _test_withdraw_release();
    }

    function test_bac_get_earn_harvest_rewards() public {
        _test_get_earn_harvest_rewards();
    }
}
