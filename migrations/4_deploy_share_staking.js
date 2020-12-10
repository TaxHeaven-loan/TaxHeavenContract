const fs = require('fs');

const {
    dividendInterval,
} = require('./constants.production.js');

const Staking = artifacts.require('Staking');

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

    const stakingContractInstance = await (async () => {
        if (contractAddresses.ShareStaking) {
            return Staking.at(contractAddresses.ShareStaking);
        }

        let startTime = 0;
        if (network === 'mainnet' || network === 'ropsten') {
            startTime = Math.floor(new Date().getTime() / 1000 / DAYS) * DAYS;
        } else {
            const block = await web3.eth.getBlock('latest');
            startTime = Number(block.timestamp);
        }

        return deployer
            .deploy(Staking, contractAddresses.ShareToken, owner, startTime, dividendInterval)
            .then(() => {
                return Staking.deployed();
            });
    })();

    // if (network !== 'mainnet' && network !== 'ropsten' && network !== 'bsc' && network !== 'bscTestnet') {
    //     await stakingContractInstance.updateGovernanceAddress(contractAddresses.Governance);
    // }

    const output = {
        ...contractAddresses,
        ShareStaking: stakingContractInstance.address,
    };
    const dump = process.env.DUMP || 'dump.json';
    fs.writeFileSync(dump, JSON.stringify(output, null, 2));
};
