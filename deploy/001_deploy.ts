import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { network, ethers } from 'hardhat';
import { BigNumber, utils } from 'ethers';
import config from '../config/config'


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();


    const netConf = config[await hre.getChainId()];
    let controllerV4 = await hre.ethers.getContract("ControllerV4", deployer);
    console.log(controllerV4.address);
    let res = await deploy('StrategyBasisBac', {
        from: deployer,
        args: [
            netConf['governance'],
            netConf['strategist'],
            controllerV4.address,
            netConf['timelock'],
            netConf['redeem'],
            netConf['burn'],
            netConf['bond'],
        ],
    });
    // test
    // const _bac = '0x3449fc1cd036255ba1eb19d65ff4ba2b8903a69a'
    // await network.provider.send("hardhat_setBalance", [
    //     deployer,
    //     "0x100000000000000000000",
    // ]);
    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: ["0x0d0707963952f2fba59dd06f2b425ace40b492fe"]
    // })
    // const bacHolder = await ethers.provider.getSigner("0x0d0707963952f2fba59dd06f2b425ace40b492fe")
    // let strategyBasisBac = await hre.ethers.getContractAt("StrategyBasisBac", res.address);
    // console.log('redeem fee', await strategyBasisBac.redeemFee())
    // let bac = await hre.ethers.getContractAt("IERC20", _bac, bacHolder);
    // await bac.connect(bacHolder).transfer(res.address, '1000000000000000000')
    // console.log('valut bac before', await bac.balanceOf(res.address))
    // console.log('redeem bac before', await bac.balanceOf(_redeem))
    // await strategyBasisBac.rechargeCash()
    // console.log('redeem bac after', await bac.balanceOf(_redeem))
    // console.log('valut bac after', await bac.balanceOf(res.address))
};
export default func;
func.tags = ["token"]
