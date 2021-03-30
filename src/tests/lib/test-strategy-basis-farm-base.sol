pragma solidity ^0.6.7;

import "../lib/hevm.sol";
import "../lib/user.sol";
import "../lib/test-approx.sol";
import "../lib/test-defi-base.sol";

import "../../interfaces/strategy.sol";
import "../../interfaces/uniswapv2.sol";

import "../../basis-vault.sol";
import "../../controller-v4.sol";

contract StrategyBasisFarmTestBase is DSTestDefiBase {
    address want;
    address token1;

    address governance;
    address strategist;
    address timelock;

    address devfund;
    address treasury;

    BasisVault basisVault;
    ControllerV4 controller;
    IStrategy strategy;

    function _getWant(uint256 daiAmount, uint256 amount) internal {
        address[] memory path = new address[](3);
        path[0] = weth;
        path[1] = dai;
        path[2] = token1;

        _getERC20(dai, daiAmount);
        _getERC20WithPath(path, amount);
    }

    // **** Tests ****

    function _test_timelock() internal {
        assertTrue(strategy.timelock() == timelock);
        strategy.setTimelock(address(1));
        assertTrue(strategy.timelock() == address(1));
    }

    function _test_withdraw_release() internal {
        uint256 decimals = ERC20(token1).decimals();
        _getWant(100 ether, 4000 * (10**decimals));
        uint256 _want = IERC20(want).balanceOf(address(this));
        IERC20(want).safeApprove(address(basisVault), 0);
        IERC20(want).safeApprove(address(basisVault), _want);
        basisVault.deposit(_want);
        basisVault.earn();
        hevm.warp(block.timestamp + 1 weeks);
        strategy.harvest();

        // Checking withdraw
        uint256 _before = IERC20(want).balanceOf(address(basisVault));
        controller.withdrawAll(want);
        uint256 _after = IERC20(want).balanceOf(address(basisVault));
        assertTrue(_after > _before);
        _before = IERC20(want).balanceOf(address(this));
        basisVault.withdrawAll();
        _after = IERC20(want).balanceOf(address(this));
        assertTrue(_after > _before);

        // Check if we gained interest
        assertTrue(_after > _want);
    }

    function _test_get_earn_harvest_rewards() internal {
        uint256 decimals = ERC20(token1).decimals();
        _getWant(100 ether, 4000 * (10**decimals));
        uint256 _want = IERC20(want).balanceOf(address(this));
        IERC20(want).safeApprove(address(basisVault), 0);
        IERC20(want).safeApprove(address(basisVault), _want);
        basisVault.deposit(_want);
        basisVault.earn();
        hevm.warp(block.timestamp + 1 weeks);

        // Call the harvest function
        uint256 _before = basisVault.balance();
        uint256 _treasuryBefore = IERC20(want).balanceOf(treasury);
        strategy.harvest();
        uint256 _after = basisVault.balance();
        uint256 _treasuryAfter = IERC20(want).balanceOf(treasury);

        uint256 earned = _after.sub(_before).mul(1000).div(800);
        uint256 earnedRewards = earned.mul(200).div(1000); // 20%
        uint256 actualRewardsEarned = _treasuryAfter.sub(_treasuryBefore);

        // 20% performance fee is given
        assertEqApprox(earnedRewards, actualRewardsEarned);

        // Withdraw
        uint256 _devBefore = IERC20(want).balanceOf(devfund);
        _treasuryBefore = IERC20(want).balanceOf(treasury);
        basisVault.withdrawAll();
        uint256 _devAfter = IERC20(want).balanceOf(devfund);
        _treasuryAfter = IERC20(want).balanceOf(treasury);

        // 0% goes to dev
        uint256 _devFund = _devAfter.sub(_devBefore);
        assertEq(_devFund, 0);

        // 0% goes to treasury
        uint256 _treasuryFund = _treasuryAfter.sub(_treasuryBefore);
        assertEq(_treasuryFund, 0);
    }
}
