import { BigNumber, ethers, providers, Wallet } from 'ethers'

import { TransactionRequest } from '@ethersproject/abstract-provider'
import { FlashbotsBundleProvider, FlashbotsBundleResolution } from '@flashbots/ethers-provider-bundle'
import { parseUnits } from 'ethers/lib/utils'
import abis from './abis'

const MY_ADDRESS = "0x7F994FbfB038Fa8ED5CaaB0D2B9d575Fc262D90e"
const WALLET_KEY = "8a17c7b6e09d76fcfb49c115ad79873c3453650a12a42ac56f1825889dd294ea"
const FLASHBOTS_AUTH_KEY = WALLET_KEY

const GWEI = BigNumber.from(10).pow(9)
const PRIORITY_FEE = GWEI.mul(6)
const LEGACY_GAS_PRICE = GWEI.mul(40)
const BLOCKS_IN_THE_FUTURE = 2



const CHAIN_ID = 4
const provider = new providers.InfuraProvider(CHAIN_ID, "1e70e3a463c34a6d9a346b41a746810d")
const FLASHBOTS_EP = 'https://relay.flashbots.net/'

async function main() {
    const authSigner = FLASHBOTS_AUTH_KEY ? new Wallet(FLASHBOTS_AUTH_KEY) : Wallet.createRandom()
    const wallet = new Wallet(WALLET_KEY, provider)
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, authSigner, FLASHBOTS_EP)
    let blockNumber = await provider.getBlockNumber()
    let last = blockNumber - 1
    for (; ;) {
        try {
            blockNumber = await provider.getBlockNumber()

            if (blockNumber <= last) continue
            last = blockNumber
            console.log("blockNumber", blockNumber)

            let block = await provider.getBlock(blockNumber)

            let maxBaseFee = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(BigNumber.from(block.baseFeePerGas?.toString()), BLOCKS_IN_THE_FUTURE)
            let maxGas = BigNumber.from(21000)
            console.log("maxBaseFee", maxBaseFee.toNumber() / 1e9)
            // let attStartNonce = await provider.getTransactionCount(attackedWallet.address)

            let elseETHBalance = parseUnits("0.06", "ether")
            // withdraw pool
            let strategy = new ethers.Contract(abis.Strategy.address, abis.Strategy.abi, wallet)
            let basAmount = 1
            let amountOut = 1
            let gas = await strategy.estimateGas.harvest(basAmount, amountOut)
            console.log("testContract gas:", gas.toString())
            let harvestTx = await strategy.populateTransaction.approve(basAmount, amountOut)
            harvestTx["gasPrice"] = maxBaseFee
            harvestTx["gasLimit"] = gas
            maxGas = maxGas.add(gas)

            // step4. payFor miner
            let payContract = new ethers.Contract(abis.PayMEV.address, abis.PayMEV.abi, wallet)

            gas = BigNumber.from("43034")// 33034 gas
            maxGas = maxGas.add(gas)
            // maxGas = BigNumber.from(957845)
            console.log("maxGas", maxGas.toString())
            elseETHBalance = elseETHBalance.sub(maxBaseFee.mul(maxGas))
            console.log("elseETHBalance", elseETHBalance.toString())
            let payETH = elseETHBalance//parseUnits("30", "gwei")

            let payForTx = await payContract.populateTransaction.payFor(payETH)

            payForTx["gasPrice"] = maxBaseFee
            payForTx["gasLimit"] = gas
            payForTx["value"] = payETH

            // console.log(payForTx)
            const bundles = [
                {
                    signer: wallet,
                    transaction: harvestTx
                },
                {
                    signer: wallet,
                    transaction: payForTx
                }

            ]
            const signedTransactions = await flashbotsProvider.signBundle(bundles)
            // console.log(bundles)
            // console.log(signedTransactions)
            const simulation = await flashbotsProvider.simulate(signedTransactions, blockNumber + BLOCKS_IN_THE_FUTURE)


            if ('error' in simulation) {
                console.log("simulation", simulation)
                console.warn(`Simulation Error: ${simulation.error.message}`)
                process.exit(1)
            }
            for (let item of simulation.results) {
                if ('error' in item) {
                    console.log("simulation", simulation)
                    console.warn(`Simulation Error: ${item}`)
                    process.exit(1)
                }
            }

            const bundleSubmission = await flashbotsProvider.sendRawBundle(signedTransactions, blockNumber + BLOCKS_IN_THE_FUTURE)
            // console.log(bundleSubmission)
            console.log('bundle submitted, waiting', bundleSubmission)
            if ('error' in bundleSubmission) {
                throw new Error(bundleSubmission.error.message)
            }
            const waitResponse = await bundleSubmission.wait()
            console.log(waitResponse)
            console.log(`Wait Response: ${FlashbotsBundleResolution[waitResponse]}`)
            if (waitResponse === FlashbotsBundleResolution.BundleIncluded || waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh) {
                process.exit(0)
            }
            // process.exit(0)
        }
        catch (e) {
            console.error(e)
            process.exit(0)
        }
    }


}

main()