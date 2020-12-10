const fs = require('fs');

const BigNumber = require('bignumber.js');

require('dotenv').config();

const { VERSION } = process.env;
console.log("version", VERSION);

const {
    decimalsOfTaxToken,
    decimalsOfFundRate,
    developerFundRateE0,
    incentiveFundRateE0,
    halvingStartLendingValueE0,
    maxTotalSupply,
    initialMintUnitE0,
    interestE0,
    dividendInterval,
    preVoteLength,
    totalVoteLength,
    expirationLength,
    minVoteE0,
    minVoteCoreE0,
    minCommitE0,
} = require(`./constants.${VERSION || 'production'}.js`);

const Staking = artifacts.require('Staking');
const Lending = artifacts.require('Lending');
const TaxToken = artifacts.require('TaxToken');
const Governance = artifacts.require('Governance');

const ZERO_ADDRESS = '0x'.padEnd(42, '0');
const DAYS = 86400;
const WEEKS = DAYS * 7;

module.exports = async (deployer, network, accounts) => {
    if (network !== 'mainnet' && network !== 'ropsten' && network !== 'bsc' && network !== 'bscTestnet') {
        return;
    }

    await deployer;

    const inputFile = process.env.DUMP || 'dump.json';
    const contractAddresses = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

    const owner = accounts[0];
    const developer = contractAddresses.developer || owner;
    const taxTokenInstance = await (() => {
        if (contractAddresses.TaxToken) {
            return TaxToken.at(contractAddresses.TaxToken);
        }

        const incentiveAllocation = { [owner]: 1 };

        return deployer
            .deploy(
                TaxToken,
                owner,
                developer,
                Object.keys(incentiveAllocation),
                Object.values(incentiveAllocation).map((v) =>
                    Math.floor(v * 10 ** decimalsOfFundRate)
                ),
                developerFundRateE0 * 10 ** decimalsOfFundRate,
                incentiveFundRateE0 * 10 ** decimalsOfFundRate,
                ZERO_ADDRESS,
                halvingStartLendingValueE0,
                new BigNumber(maxTotalSupply).shiftedBy(decimalsOfTaxToken).toString(10),
                new BigNumber(initialMintUnitE0).shiftedBy(decimalsOfTaxToken).toString(10)
            )
            .then(() => {
                return TaxToken.deployed();
            });
    })();

    {
        const oracleAddress = await taxTokenInstance.getOracleAddress(ZERO_ADDRESS);
        console.log('oracleAddress', oracleAddress);
        if (
            contractAddresses.EthPriceOracle &&
            oracleAddress !== contractAddresses.EthPriceOracle
        ) {
            await taxTokenInstance.registerWhitelist(
                ZERO_ADDRESS, // ETH_ADDRESS
                contractAddresses.EthPriceOracle
            );
        }
    }

    const stakingContractInstance = await (async () => {
        if (contractAddresses.Staking) {
            return Staking.at(contractAddresses.Staking);
        }

        let startTime = 0;
        if (network === 'mainnet' || network === 'ropsten') {
            startTime = Math.floor(new Date().getTime() / 1000 / DAYS) * DAYS;
        } else {
            const block = await web3.eth.getBlock('latest');
            startTime = Number(block.timestamp);
        }

        return deployer
            .deploy(Staking, taxTokenInstance.address, owner, startTime, dividendInterval)
            .then(() => {
                return Staking.deployed();
            });
    })();

    const lendingContractInstance = await (() => {
        if (contractAddresses.Lending) {
            return Lending.at(contractAddresses.Lending);
        }

        return deployer
            .deploy(
                Lending,
                taxTokenInstance.address,
                stakingContractInstance.address,
                interestE0 * 10 ** 3
            )
            .then(() => {
                return Lending.deployed();
            });
    })();

    {
        const lendingContractAddress = await taxTokenInstance.getLendingAddress();
        console.log('lendingContractAddress', lendingContractAddress);
        if (lendingContractAddress !== lendingContractInstance.address) {
            await taxTokenInstance.updateLendingAddress(lendingContractInstance.address);
        }
    }

    const governanceInstance = await (() => {
        if (contractAddresses.Governance) {
            return Governance.at(contractAddresses.Governance);
        }

        return deployer
            .deploy(
                Governance,
                taxTokenInstance.address,
                preVoteLength,
                totalVoteLength,
                expirationLength,
                minVoteE0 * 10 ** 4,
                minVoteCoreE0 * 10 ** 4,
                minCommitE0 * 10 ** 4
            )
            .then(() => {
                return Governance.deployed();
            });
    })();

    // if (network !== 'mainnet' && network !== 'ropsten' && network !== 'bsc' && network !== 'bscTestnet') {
    //     await taxTokenInstance.updateGovernanceAddress(governanceInstance.address);
    //     await stakingContractInstance.updateGovernanceAddress(governanceInstance.address);
    // }

    const output = {
        ...contractAddresses,
        TaxToken: taxTokenInstance.address,
        Staking: stakingContractInstance.address,
        Lending: lendingContractInstance.address,
        Governance: governanceInstance.address,
    };
    const dump = process.env.DUMP || 'dump.json';
    fs.writeFileSync(dump, JSON.stringify(output, null, 2));
};
