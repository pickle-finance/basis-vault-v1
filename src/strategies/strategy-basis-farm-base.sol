// SPDX-License-Identifier: MIT
pragma solidity ^0.6.7;

import "./strategy-staking-rewards-base.sol";

abstract contract StrategyBasisFarmBase is StrategyStakingRewardsBase {
    // Token addresses
    address public bas = 0xa7ED29B253D8B4E3109ce07c80fc570f81B63696;
    address public dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    // DAI/<token1> pair
    address public token1;
    
    // How much BAS tokens to keep?
    uint256 public keepBAS = 0;
    uint256 public constant keepBASMax = 10000;

    constructor(
        address _token1,
        address _rewards,
        address _want,
        address _governance,
        address _strategist,
        address _controller,
        address _timelock
    )
        public
        StrategyStakingRewardsBase(
            _rewards,
            _want,
            _governance,
            _strategist,
            _controller,
            _timelock
        )
    {
        token1 = _token1;
        IERC20(dai).approve(univ2Router2, uint(-1));
        IERC20(bas).approve(univ2Router2, uint(-1));
    }

    // **** Setters ****

    function setKeepBAS(uint256 _keepBAS) external {
        require(msg.sender == timelock, "!timelock");
        keepBAS = _keepBAS;
    }

    // **** State Mutations ****

    function harvest() public override onlyBenevolent {
        address[] memory path = new address[](2);
        // Collects BAS tokens
        IStakingRewards(rewards).getReward();
        uint256 _bas = IERC20(bas).balanceOf(address(this));
        if (_bas > 0) {
            // 10% is locked up for future gov
            uint256 _keepBAS = _bas.mul(keepBAS).div(keepBASMax);
            IERC20(bas).safeTransfer(
                IController(controller).treasury(),
                _keepBAS
            );
            path[0] = bas;
            path[1] = dai;
            path[2] = bac;
            _swapUniswapWithPath(path, _bas.sub(_keepBAS));
        }

        // We want to get back BAS LP tokens
        _distributePerformanceFeesAndDeposit();
    }
}
