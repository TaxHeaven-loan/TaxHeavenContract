const fs = require('fs');

const {
    decimalsOfLendingToken,
    lendingTokenPriceE0,
    decimalsOfLendingTokenPrice
} = require('./constants.production.js');

const TestLendingToken = artifacts.require('TestToken');
const TestEthPriceOracle = artifacts.require('TestOracle');

module.exports = async (deployer, network, accounts) => {
    if (network !== 'mainnet' && network !== 'ropsten' && network !== 'bsc' && network !== 'bscTestnet') {
        return;
    }

    await deployer;

    const inputFile = process.env.DUMP || 'dump.json';
    const contractAddresses = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

    const testLendingTokenInstance = await (() => {
        if (contractAddresses.LendingToken) {
            return TestLendingToken.at(contractAddresses.LendingToken);
        }

        return deployer
            .deploy(TestLendingToken, 'Lending', 'LT', decimalsOfLendingToken)
            .then(() => {
                return TestLendingToken.deployed();
            });
    })();

    const ethPriceOracleInstance = await (() => {
        if (contractAddresses.EthPriceOracle) {
            return TestEthPriceOracle.at(contractAddresses.EthPriceOracle);
        }

        return deployer
            .deploy(
                TestEthPriceOracle,
                lendingTokenPriceE0 * 10 ** decimalsOfLendingTokenPrice,
                decimalsOfLendingTokenPrice
            )
            .then(() => {
                return TestEthPriceOracle.deployed();
            });
    })();

    const output = {
        ...contractAddresses,
        LendingToken: testLendingTokenInstance.address,
        EthPriceOracle: ethPriceOracleInstance.address,
    };
    const dump = process.env.DUMP || 'dump.json';
    fs.writeFileSync(dump, JSON.stringify(output, null, 2));
};
