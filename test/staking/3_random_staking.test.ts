import { init, ContractInterfaces } from '../init';
import { getBalance, transferToken, getAccountInfo, getTokenInfo, getTermInfo } from './util';
import { advanceTerm, INTERVAL, ZERO_ADDRESS } from '../util';
import {
    addAmount,
    getAmount,
    getRandomToken,
    getRandomWhat,
    getRandomWhen,
    getRandomWho,
    newRandomCounter,
    RandomCounter,
    StakingWhat,
} from './randomCases';
import fs from 'fs';
import cloneDeep from 'lodash/cloneDeep';

const fetchJsonInfo = async (option: {
    contracts: ContractInterfaces;
    caseName: string;
    who: string;
    tokenAddress: string;
    amount: number;
    randomCounter: RandomCounter;
    errorMessage?: string;
}) => {
    const { contracts, caseName, who, tokenAddress, amount, randomCounter, errorMessage } = option;
    const tokenInfo = await getTokenInfo(tokenAddress, {
        stakingContractInstance: contracts.stakingContract,
        decimalsOfStakingToken: 0,
        decimalsOfRewardToken: 0,
    });
    const currentTerm = tokenInfo.currentTerm;
    const accountInfo = await getAccountInfo(tokenAddress, who, {
        stakingContractInstance: contracts.stakingContract,
        decimalsOfStakingToken: 0,
        decimalsOfRewardToken: 0,
    });
    const termInfo = await getTermInfo(tokenAddress, currentTerm, {
        stakingContractInstance: contracts.stakingContract,
        decimalsOfStakingToken: 0,
        decimalsOfRewardToken: 0,
    });
    const balance = await getBalance(tokenAddress, who);
    const stakingBalance = await contracts.stakingTokenContract.balanceOf(who);
    const deposit = await getBalance(tokenAddress, contracts.stakingContract.address);

    const preJson = {
        caseName: `${caseName} with ${amount}`,
        tokenInfo: {
            currentTerm: tokenInfo.currentTerm,
            latestTerm: tokenInfo.latestTerm,
            totalRemainingRewards: tokenInfo.totalRemainingRewards.toString(),
            currentReward: tokenInfo.currentReward.toString(),
            nextTermRewards: tokenInfo.nextTermRewards.toString(),
            currentStaking: tokenInfo.currentStaking.toString(),
            nextTermStaking: tokenInfo.nextTermStaking.toString(),
        },
        accountInfo: {
            userTerm: accountInfo.userTerm,
            stakeAmount: accountInfo.stakeAmount.toString(),
            nextAddedStakeAmount: accountInfo.nextAddedStakeAmount.toString(),
            currentReward: accountInfo.currentReward.toString(),
            nextLatestTermUserRewards: accountInfo.nextLatestTermUserRewards.toString(),
            depositAmount: accountInfo.depositAmount.toString(),
            withdrawableStakingAmount: accountInfo.withdrawableStakingAmount.toString(),
        },
        termInfo: {
            stakeAdd: termInfo.stakeAdd.toString(),
            stakeSum: termInfo.stakeSum.toString(),
            rewardSum: termInfo.rewardSum.toString(),
        },
        balance: balance.toString(),
        stakingBalance: stakingBalance.toString(),
        deposit: deposit.toString(),
        counter: cloneDeep(randomCounter),
        errorMessage,
    };
    return preJson;
};

contract('Staking', (accounts) => {
    const deployer = accounts[0];
    const depositor = accounts[4];
    let contracts: ContractInterfaces;
    before(async () => {
        contracts = await init({ deployer, interval: INTERVAL });
        await contracts.stakingTokenContract.mint(1000000, { from: accounts[0] });
        await contracts.stakingTokenContract.approve(contracts.stakingContract.address, 1000000, {
            from: accounts[0],
        });
        await contracts.stakingTokenContract.mint(1000000, { from: accounts[1] });
        await contracts.stakingTokenContract.approve(contracts.stakingContract.address, 1000000, {
            from: accounts[1],
        });
        await contracts.stakingTokenContract.mint(1000000, { from: accounts[2] });
        await contracts.stakingTokenContract.approve(contracts.stakingContract.address, 1000000, {
            from: accounts[2],
        });
        await contracts.stakingTokenContract.mint(1000000, { from: accounts[3] });
        await contracts.stakingTokenContract.approve(contracts.stakingContract.address, 1000000, {
            from: accounts[3],
        });
        await contracts.rewardTokenContract.mint(1000000, { from: accounts[4] });
    });

    describe('random', async () => {
        let randomCounter = [newRandomCounter(), newRandomCounter()];
        for (let caseIndex = 0; caseIndex < 100; caseIndex++) {
            // Default skip random cases.
            // it(`case ${caseIndex}`, async () => {
            it.skip(`case ${caseIndex}`, async () => {
                const token = getRandomToken();
                const who = getRandomWho(accounts);
                const when = getRandomWhen();
                const what = getRandomWhat() as StakingWhat;
                const whoIndex = accounts.indexOf(who);
                let counter = token == ZERO_ADDRESS ? randomCounter[0] : randomCounter[1];
                const caseName = `Account_${whoIndex} ${what} after Term +${when}[${
                    token === ZERO_ADDRESS ? 'ETH' : token
                }]`;
                const tokenAddress =
                    token === ZERO_ADDRESS ? ZERO_ADDRESS : contracts.rewardTokenContract.address;
                const toTokenAddress =
                    token === ZERO_ADDRESS ? contracts.rewardTokenContract.address : ZERO_ADDRESS;
                const amount = getAmount(counter, accounts, who, what);
                let errorMessage = '';
                console.log(`${caseName} with ${amount}`);
                const prevJson = await fetchJsonInfo({
                    contracts,
                    caseName,
                    who,
                    tokenAddress,
                    amount,
                    randomCounter: counter,
                });
                await advanceTerm(when);
                try {
                    switch (what) {
                        case 'STAKE':
                            await contracts.stakingContract.stake(tokenAddress, amount, {
                                from: who,
                            });
                            break;
                        case 'WITHDRAW':
                            await contracts.stakingContract.withdraw(tokenAddress, amount, {
                                from: who,
                            });
                            break;
                        case 'RECEIVE':
                            await contracts.stakingContract.receiveReward(tokenAddress, {
                                from: who,
                            });
                            break;
                        case 'CHANGE':
                            await contracts.stakingContract.changeStakeTarget(
                                tokenAddress,
                                toTokenAddress,
                                amount,
                                {
                                    from: who,
                                }
                            );
                            break;
                        case 'DEPOSIT':
                            await transferToken(
                                tokenAddress,
                                depositor,
                                contracts.stakingContract.address,
                                amount
                            );
                    }
                } catch (err) {
                    errorMessage = err.message;
                }

                addAmount(counter, accounts, who, what);

                const afterJson = await fetchJsonInfo({
                    contracts,
                    caseName,
                    who,
                    tokenAddress,
                    amount,
                    randomCounter: counter,
                    errorMessage,
                });

                const filename = `log/${('000' + caseIndex).slice(-3)}_${
                    token === ZERO_ADDRESS ? 'ETH' : token
                }_${whoIndex}_${what}_Term+${when}${errorMessage === '' ? '' : '_failed'}.json`;
                const output = JSON.stringify({
                    prevJson,
                    afterJson,
                });
                console.log(output);
                await fs.writeFileSync(filename, output);
            });
        }
    });
});
