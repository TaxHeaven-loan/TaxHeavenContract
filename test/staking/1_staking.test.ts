import { init, ContractInterfaces } from '../init';
import { getBalance, transferToken, getAccountInfo, getTokenInfo } from './util';
import { advanceTime, INTERVAL, ZERO_ADDRESS } from '../util';
import { getTestData } from './testCases';

contract('Staking', (accounts) => {
    const deployer = accounts[0];
    let contracts: ContractInterfaces;
    before(async () => {
        contracts = await init({ deployer, interval: INTERVAL });
        await contracts.stakingTokenContract.mint(1000000, { from: accounts[0] });
        await contracts.stakingTokenContract.mint(1000000, { from: accounts[2] });
        await contracts.rewardTokenContract.mint(1000000, { from: accounts[1] });
    });

    describe('scenario', async () => {
        console.log('contracts: ', contracts);
        for (const [caseIndex, data] of getTestData(accounts).entries()) {
            it(`${data.case}(case ${caseIndex})`, async () => {
                const rewardAddress =
                    data.rewardToken === 'ETH'
                        ? ZERO_ADDRESS
                        : data.rewardToken === 'token2'
                        ? contracts.rewardToken2Contract.address
                        : contracts.rewardTokenContract.address;
                console.log('The execution:', data);

                if (data.stakeAmount !== undefined) {
                    // staking
                    await contracts.stakingTokenContract.approve(
                        contracts.stakingContract.address,
                        data.stakeAmount,
                        { from: data.sender }
                    );
                    await contracts.stakingContract.stake(rewardAddress, data.stakeAmount, {
                        from: data.sender,
                    });
                }
                if (data.withdrawAmount !== undefined) {
                    // withdraw
                    await contracts.stakingContract.withdraw(rewardAddress, data.withdrawAmount, {
                        from: data.sender,
                    });
                }
                if (data.voteDepositAmount !== undefined) {
                    await contracts.stakingContract.voteDeposit(
                        data.sender,
                        data.voteDepositAmount,
                        {
                            from: deployer,
                        }
                    );
                }
                if (data.voteWithdrawAmount !== undefined) {
                    await contracts.stakingContract.voteWithdraw(
                        data.sender,
                        data.voteWithdrawAmount,
                        {
                            from: deployer,
                        }
                    );
                }
                if (data.expectedRewards !== undefined) {
                    const prev = await getBalance(rewardAddress, data.sender);
                    // receiveRewards
                    await contracts.stakingContract.receiveReward(rewardAddress, {
                        from: data.sender,
                        gasPrice: 0,
                    });
                    const reward = await getBalance(rewardAddress, data.sender);
                    assert.equal(
                        reward.minus(prev).toNumber(),
                        data.expectedRewards,
                        'do not match expected rewards'
                    );
                }
                if (data.deposit !== undefined) {
                    // deposit to rewards from sender.
                    await transferToken(
                        rewardAddress,
                        data.sender,
                        contracts.stakingContract.address,
                        data.deposit
                    );
                }
                if (data.term !== undefined) {
                    // advanced Term
                    await advanceTime(INTERVAL * data.term);
                    await contracts.stakingContract.receiveReward(rewardAddress, {
                        from: accounts[4],
                    }); // updateTerm
                }

                const { currentTerm, currentReward, nextTermStaking } = await getTokenInfo(
                    rewardAddress,
                    {
                        stakingContractInstance: contracts.stakingContract,
                        decimalsOfStakingToken: 0,
                        decimalsOfRewardToken: 0,
                    }
                );

                if (data.currentStaking !== undefined) {
                    assert.equal(
                        nextTermStaking.toNumber(),
                        data.currentStaking,
                        'do not match expected sum of current staking'
                    );
                }
                if (data.currentStakingOf !== undefined) {
                    for (const stakingOf of data.currentStakingOf) {
                        const {
                            userTerm,
                            depositAmount,
                            withdrawableStakingAmount,
                        } = await getAccountInfo(rewardAddress, stakingOf.account, {
                            stakingContractInstance: contracts.stakingContract,
                            decimalsOfStakingToken: 0,
                            decimalsOfRewardToken: 0,
                        });
                        assert.equal(
                            depositAmount.toNumber(),
                            stakingOf.deposit,
                            'do not match expected deposit amount'
                        );
                        assert.equal(
                            withdrawableStakingAmount.toNumber(),
                            stakingOf.withdrawable ?? stakingOf.deposit,
                            'do not match expected withdrawable staking amount'
                        );
                        assert.equal(userTerm, stakingOf.term, 'do not match expected user term');
                    }
                }
                if (data.destinations !== undefined) {
                    const stakingDestinations = await contracts.stakingContract.getStakingDestinations(
                        data.sender
                    );
                    assert.deepEqual(
                        stakingDestinations,
                        data.destinations.map((v) =>
                            v === 'token2'
                                ? contracts.rewardToken2Contract.address
                                : contracts.rewardTokenContract.address
                        ),
                        'do not match expected staking destinations'
                    );
                }
                if (data.termReward !== undefined) {
                    assert.equal(
                        currentReward.toNumber(),
                        data.termReward,
                        'do not match expected term reward'
                    );
                }
                if (data.current !== undefined) {
                    assert.equal(currentTerm, data.current, 'do not match expected current term.');
                }

                for (const accountIndex of [0, 2]) {
                    const accountInfo = await getAccountInfo(
                        rewardAddress,
                        accounts[accountIndex],
                        {
                            stakingContractInstance: contracts.stakingContract,
                            decimalsOfStakingToken: 0,
                            decimalsOfRewardToken: 0,
                        }
                    );
                    console.log(`the account info of accounts[${accountIndex}]:`, accountInfo);
                }
                const accountStakingAmount0 = await contracts.stakingTokenContract.balanceOf(
                    accounts[0]
                );
                const accountStakingAmount2 = await contracts.stakingTokenContract.balanceOf(
                    accounts[2]
                );
                const contractStakingAmount = await contracts.stakingTokenContract.balanceOf(
                    contracts.stakingContract.address
                );
                const accountRewardAmount0 = await getBalance(rewardAddress, accounts[0]);
                const accountRewardAmount2 = await getBalance(rewardAddress, accounts[2]);
                const contractRewardAmount = await getBalance(
                    rewardAddress,
                    contracts.stakingContract.address
                );

                console.log(
                    'Result:',
                    currentTerm,
                    accountStakingAmount0.toNumber(),
                    accountStakingAmount2.toNumber(),
                    contractStakingAmount.toNumber(),
                    accountRewardAmount0.toString(),
                    accountRewardAmount2.toString(),
                    contractRewardAmount.toString()
                );
            });
        }
    });
});
