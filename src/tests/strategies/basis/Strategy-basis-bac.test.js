const hre = require("hardhat");
var chaiAsPromised = require("chai-as-promised");
const StrategyBasisBac = hre.artifacts.require("StrategyBasisBac");
const BasisVault = hre.artifacts.require("BasisVault");
const ControllerV4 = hre.artifacts.require("ControllerV4");

const {assert} = require("chai").use(chaiAsPromised);
const {time} = require("@openzeppelin/test-helpers");

const unlockAccount = async (address) => {
    await hre.network.provider.send("hardhat_impersonateAccount", [address]);
    return hre.ethers.provider.getSigner(address);
};

const toWei = (ethAmount) => {
    return hre.ethers.constants.WeiPerEther.mul(hre.ethers.BigNumber.from(ethAmount));
};

describe("StrategyBasisBac Unit test", () => {
    let strategy, basisVault;
    let controller;
    const want = "0x3449FC1Cd036255BA1EB19d65fF4BA2b8903A69a";
    let bac_whale;
    let alice, bob;
    let bac;
    let governance, strategist, devfund, treasury, timelock;

    let operator;

    before("Deploy contracts", async () => {
        [governance, devfund, treasury] = await web3.eth.getAccounts();
        const signers = await hre.ethers.getSigners();
        alice = signers[0];
        bob = signers[1];
        john = signers[2];

        strategist = governance;
        timelock = governance;

        controller = await ControllerV4.new(governance, strategist, timelock, devfund, treasury);

        console.log("controller is deployed at =====> ", controller.address);

        operator = await unlockAccount("0x68C3a95B35C45Db5dB67ed83c43305052FAD6e04");

        strategy = await StrategyBasisBac.new(governance, strategist, controller.address, timelock);

        console.log("Strategy is deployed at =====> ", strategy.address);

        const proxyContract = await hre.ethers.getContractAt("IStakingRewards", "0x190503cFbE97d77E83dedfC550C79EFd6E2E799f");
        proxyContract.connect(operator).transferOperator(strategy.address);

        basisVault = await BasisVault.new(want, governance, timelock, controller.address);
        console.log("basisVault is deployed at =====> ", basisVault.address);

        await controller.setVault(want, basisVault.address, {from: governance});
        await controller.approveStrategy(want, strategy.address, {
            from: governance,
        });
        await controller.setStrategy(want, strategy.address, {from: governance});

        await strategy.setKeepBAS("2000", {from: governance});

        bac_whale = await unlockAccount("0x5047C5398009249Fa4ceBa72Ea706F82eea20649");


        bac = await hre.ethers.getContractAt("ERC20", want);

        bac.connect(bac_whale).transfer(alice.address, toWei(10000));
        assert.equal((await bac.balanceOf(alice.address)).toString(), toWei(10000).toString());
        bac.connect(bac_whale).transfer(bob.address, toWei(10000));
        assert.equal((await bac.balanceOf(bob.address)).toString(), toWei(10000).toString());
        bac.connect(bac_whale).transfer(john.address, toWei(10000));
        assert.equal((await bac.balanceOf(john.address)).toString(), toWei(10000).toString());
    });

    it("Should harvest the reward correctly", async () => {
        console.log("\n---------------------------Alice deposit---------------------------------------\n");
        await bac.connect(alice).approve(basisVault.address, toWei(2000));
        await basisVault.deposit(toWei(2000), { from: alice.address });
        await basisVault.earn({from: alice.address});
        console.log("alice pToken balance =====> ", (await basisVault.balanceOf(alice.address)).toString());

        await harvest();

        console.log("\n---------------------------Bob deposit---------------------------------------\n");
        await bac.connect(bob).approve(basisVault.address, toWei(1000));
        await basisVault.deposit(toWei(1000), {from: bob.address});
        await basisVault.earn({from: bob.address});
        console.log("bob pToken balance =====> ", (await basisVault.balanceOf(bob.address)).toString());

        await time.increase(60 * 60 * 24 * 7);

        console.log("\n---------------------------John deposit---------------------------------------\n");
        await bac.connect(john).approve(basisVault.address, toWei(2500));
        await basisVault.deposit(toWei(2500), {from: john.address});
        await basisVault.earn({from: john.address});
        console.log("bob pToken balance =====> ", (await basisVault.balanceOf(john.address)).toString());

        await harvest();

        console.log("\n---------------------------Alice withdraw---------------------------------------\n");
        console.log("Reward balance of strategy ====> ", (await bac.balanceOf(strategy.address)).toString());
        let _bac_before = await bac.balanceOf(alice.address);
        console.log("Alice bac balance before =====> ", _bac_before.toString());

        await basisVault.withdrawAll({from: alice.address});

        let _bac_after = await bac.balanceOf(alice.address);
        console.log("Alice bac balance after =====> ", _bac_after.toString());

        assert.equal(_bac_after.gt(_bac_before), true);

        console.log("\nPending reward after all withdrawal ====> ", (await strategy.pendingReward()).toString());

        await time.increase(60 * 60 * 24 * 3);

        console.log("\n---------------------------Alice Redeposit---------------------------------------\n");
        await bac.connect(alice).approve(basisVault.address, toWei(2000));
        await basisVault.deposit(toWei(2000), {from: alice.address});
        await basisVault.earn({from: alice.address});
        console.log("alice pToken balance =====> ", (await basisVault.balanceOf(alice.address)).toString());

        await time.increase(60 * 60 * 24 * 4);

        console.log("\n---------------------------Bob withdraw---------------------------------------\n");

        console.log("Reward balance of strategy ====> ", (await bac.balanceOf(strategy.address)).toString());
        _bac_before = await bac.balanceOf(bob.address);
        console.log("Bob bac balance before =====> ", _bac_before.toString());

        await basisVault.withdrawAll({from: bob.address});

        _bac_after = await bac.balanceOf(bob.address);
        console.log("Bob bac balance after =====> ", (await bac.balanceOf(bob.address)).toString());
        assert.equal(_bac_after.gt(_bac_before), true);

        console.log("\nPending reward after all withdrawal ====> ", (await strategy.pendingReward()).toString());

        console.log("\n---------------------------John withdraw---------------------------------------\n");
        console.log("Reward balance of strategy ====> ", (await bac.balanceOf(strategy.address)).toString());

        _bac_before = await bac.balanceOf(john.address);
        console.log("John bac balance before =====> ", _bac_before.toString());

        await basisVault.withdrawAll({from: john.address});

        _bac_after = await bac.balanceOf(john.address);
        console.log("John bac balance after =====> ", (await bac.balanceOf(john.address)).toString());
        assert.equal(_bac_after.gt(_bac_before), true);
        console.log("\nPending reward after all withdrawal ====> ", (await strategy.pendingReward()).toString());

        console.log("\n---------------------------Alice second withdraw---------------------------------------\n");
        _bac_before = await bac.balanceOf(alice.address);
        console.log("Alice bac balance before =====> ", _bac_before.toString());

        await basisVault.withdrawAll({from: alice.address});

        _bac_after = await bac.balanceOf(alice.address);
        console.log("Alice bac balance after =====> ", _bac_after.toString());

        assert.equal(_bac_after.gt(_bac_before), true);
        console.log("\nPending reward after all withdrawal ====> ", (await strategy.pendingReward()).toString());
    });

    it("Should withdraw the want correctly", async () => {
        console.log("\n---------------------------Alice deposit---------------------------------------\n");
        await bac.connect(alice).approve(basisVault.address, toWei(2000));
        await basisVault.deposit(toWei(2000), {from: alice.address});
        await basisVault.earn({from: alice.address});
        console.log("alice pToken balance =====> ", (await basisVault.balanceOf(alice.address)).toString());

        await harvest();

        console.log("\n---------------------------Bob deposit---------------------------------------\n");
        await bac.connect(bob).approve(basisVault.address, toWei(1000));
        await basisVault.deposit(toWei(1000), {from: bob.address});
        await basisVault.earn({from: bob.address});
        console.log("bob pToken balance =====> ", (await basisVault.balanceOf(bob.address)).toString());
        await harvest();

        console.log("\n---------------------------Alice withdraw---------------------------------------\n");

        let _jar_before = await bac.balanceOf(basisVault.address);
        await controller.withdrawAll(bac.address, {from: governance});
        let _jar_after = await bac.balanceOf(basisVault.address);

        let _bac_before = await bac.balanceOf(alice.address);
        console.log("Alice bac balance before =====> ", _bac_before.toString());

        await basisVault.withdrawAll({from: alice.address});

        let _bac_after = await bac.balanceOf(alice.address);
        console.log("Alice bac balance after =====> ", _bac_after.toString());

        console.log("\n---------------------------Bob withdraw---------------------------------------\n");

        _bac_before = await bac.balanceOf(bob.address);
        console.log("Bob bac balance before =====> ", _bac_before.toString());

        _jar_before = await bac.balanceOf(basisVault.address);

        await controller.withdrawAll(bac.address, {from: governance});

        _jar_after = await bac.balanceOf(basisVault.address);

        await basisVault.withdrawAll({from: bob.address});

        _bac_after = await bac.balanceOf(bob.address);
        console.log("Bob bac balance after =====> ", (await bac.balanceOf(bob.address)).toString());
        assert.equal(_bac_after.gt(_bac_before), true);
    });

    const harvest = async () => {
        await time.increase(60 * 60 * 24 * 15); //15 days
        const _balance = await strategy.balanceOfPool();
        console.log("Deposited amount of strategy ===> ", _balance.toString());

        await strategy.harvest({from: governance});
    };
});
