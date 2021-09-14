import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { network } from 'hardhat';
import { BigNumber, utils } from 'ethers';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    await network.provider.send("hardhat_setBalance", [
        deployer,
        "0x100000000000000000000",
    ]);


    const _controller = '0x80e22d271de6097c9a0296f03767e729bb8da007'
    const _governance = '0x68c3a95b35c45db5db67ed83c43305052fad6e04'
    const _strategist = '0x68c3a95b35c45db5db67ed83c43305052fad6e04'
    const _timelock = '0x68c3a95b35c45db5db67ed83c43305052fad6e04'
    const _redeem = '0xCc18b67AB02Ea402E4A9f4702523E8623e3C3a80'
    const _bond = '0xC36824905dfF2eAAEE7EcC09fCC63abc0af5Abc5'


    let res = await deploy('StrategyBasisBac', {
        from: deployer,
        args: [
            _governance,
            _strategist,
            _controller,
            _timelock,
            _redeem,
            _redeem,
            _bond
        ],
    });
    let strategyBasisBac = await hre.ethers.getContractAt("StrategyBasisBac", res.address);
    console.log(await strategyBasisBac.redeemFee())
};
export default func;
func.tags = ["token"]
