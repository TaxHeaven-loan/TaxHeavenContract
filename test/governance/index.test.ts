import {
    advanceTime,
    DAYS,
    DECIMALS_OF_TAX_TOKEN,
    expectRevert,
    fromE0,
    getBlockTimestampSec,
    mineOneBlock,
    toE0,
} from '../util';
import {
    deployGovernanceContract,
    vote,
    lockInProposal,
    withdraw,
    getProposals,
} from '../governance/util';
import { applyUnregisterWhitelistProposal } from './unregisterWhitelist/util';
import { prepareTaxToken } from '../taxToken/util';
import {
    proposeUpdateCoreParameters as propose,
    applyCoreParameterProposal as applyProposal,
} from '../governance/updateCoreParameters/util';
import { deployLendingContractWithLendingToken } from '../lending/util';

const TestToken = artifacts.require('TestToken');

contract('Governance', (accounts) => {
    const [deployer, owner, developer, proposer] = accounts;

    const decimalsOfLendingToken = 18;
    const taxTokenConfigs = {
        decimalsOfStakingRewardToken: 8,
        decimalsOfStakingToken: 8,
        stakingTermInterval: 7 * DAYS,
        developerFundRateE0: 0.05,
        incentiveFundRateE0: 0.05,
        halvingStartLendingValueE0: 10000000,
        maxTotalSupply: 50000000,
        initialMintUnitE0: 1,
        interestE0: 0.005,
        decimalsOfLendingTokenPrice: 8,
        lendingTokenPriceE0: 500,
    };

    const allocation = { [accounts[8]]: 0.4, [accounts[9]]: 0.6 };

    const initialCoreParameters = {
        preVoteLength: 7 * DAYS,
        totalVoteLength: 14 * DAYS,
        expirationLength: 1 * DAYS,
        minVote: 0.05,
        minVoteCore: 0.05,
        minCommit: 0.0001,
    };

    const newCoreParameters = {
        ...initialCoreParameters,
        expirationLength: 2 * DAYS,
    };

    describe('propose', () => {
        it('works well', async () => {
            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const {
                taxTokenInstance,
                lendingContractInstance,
            } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                taxTokenConfigs
            );

            const governanceInstance = await deployGovernanceContract(
                owner,
                taxTokenInstance,
                initialCoreParameters
            );

            const errorMessage = '';
            const initialTaxTokenSupplyE0 = 20000;

            await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            try {
                await propose(proposer, newCoreParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });
            } catch (err) {
                if (expectRevert(err.message, errorMessage)) return;
                assert.fail(`fail to propose: ${err.message}`);
            }

            assert.ok(
                errorMessage === '',
                `an error was expected, but it was successful: ${errorMessage}`
            );
        });
    });

    describe('vote', () => {
        [
            {
                title: 'works well when a voter approves the proposal',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 500,
                    },
                ],
            },
            {
                title: 'works well when a voter denies the proposal',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: false,
                        amountE0: 500,
                    },
                ],
            },
        ].forEach((testCase, caseIndex) => {
            const { title, errorMessage, initialTaxTokenSupplyE0, votes } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                const lendingTokenInstance = await TestToken.new(
                    'Test ERC20',
                    'TEST',
                    decimalsOfLendingToken
                );

                const {
                    taxTokenInstance,
                    lendingContractInstance,
                } = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    taxTokenConfigs
                );

                const governanceInstance = await deployGovernanceContract(
                    owner,
                    taxTokenInstance,
                    initialCoreParameters
                );

                await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                const { proposeId } = await propose(proposer, newCoreParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });

                for (let i = 0; i < votes.length; i++) {
                    const { accountIndex, approval, amountE0 } = votes[i];
                    const voter = accounts[accountIndex];
                    await prepareTaxToken(voter, amountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });

                    try {
                        await vote(voter, proposeId, approval, amountE0, {
                            governanceInstance,
                            taxTokenInstance,
                        });
                    } catch (err) {
                        if (expectRevert(err.message, errorMessage)) return;
                        assert.fail(`fail to vote: ${err.message}`);
                    }
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });

        const title = 'cannot vote a proposal whose pre-vote period finished without locked in';
        const errorMessage = 'voting period has expired';
        const initialTaxTokenSupplyE0 = 20000;
        it(title, async () => {
            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const {
                taxTokenInstance,
                lendingContractInstance,
            } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                taxTokenConfigs
            );

            const governanceInstance = await deployGovernanceContract(
                owner,
                taxTokenInstance,
                initialCoreParameters
            );

            await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            const { proposeId } = await propose(proposer, newCoreParameters, {
                governanceInstance,
                taxTokenInstance,
            });

            await advanceTime(initialCoreParameters.preVoteLength + 1);

            const voter = accounts[5];
            const approval = true;
            const amountE0 = 500;
            await prepareTaxToken(voter, amountE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            try {
                await vote(voter, proposeId, approval, amountE0, {
                    governanceInstance,
                    taxTokenInstance,
                });
            } catch (err) {
                if (expectRevert(err.message, errorMessage)) return;
                assert.fail(`fail to vote: ${err.message}`);
            }

            assert.fail(`an error was expected, but it was successful: ${errorMessage}`);
        });
    });

    describe('lockinProposal', () => {
        [
            {
                title:
                    'works well in the case of sufficient amount of votes (the number of votes is 1)',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
            },
            {
                title: 'works well in the case of sufficient amount of votes (case 2)',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 500,
                    },
                    {
                        accountIndex: 5,
                        approval: false,
                        amountE0: 750,
                    },
                ],
            },
            {
                title: 'works well in the case of sufficient amount of votes (case 3)',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 500,
                    },
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 750,
                    },
                ],
            },
            {
                title: 'reverts in the case of no votes',
                errorMessage: 'insufficient amount for lockin',
                initialTaxTokenSupplyE0: 20000,
                votes: [],
            },
            {
                title: 'reverts in the case of insufficient amount of votes',
                errorMessage: 'insufficient amount for lockin',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 500,
                    },
                ],
            },
            {
                title: 'reverts in the case of insufficient amount of votes (case 2)',
                errorMessage: 'insufficient amount for lockin',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 250,
                    },
                    {
                        accountIndex: 5,
                        approval: false,
                        amountE0: 250,
                    },
                ],
            },
        ].forEach((testCase, caseIndex) => {
            const { title, errorMessage, initialTaxTokenSupplyE0, votes } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                const lendingTokenInstance = await TestToken.new(
                    'Test ERC20',
                    'TEST',
                    decimalsOfLendingToken
                );

                const {
                    taxTokenInstance,
                    lendingContractInstance,
                } = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    taxTokenConfigs
                );

                const governanceInstance = await deployGovernanceContract(
                    owner,
                    taxTokenInstance,
                    initialCoreParameters
                );

                await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                const { proposeId } = await propose(proposer, newCoreParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });

                for (let i = 0; i < votes.length; i++) {
                    const { accountIndex, approval, amountE0 } = votes[i];
                    const voter = accounts[accountIndex];
                    await prepareTaxToken(voter, amountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });

                    await vote(voter, proposeId, approval, amountE0, {
                        governanceInstance,
                        taxTokenInstance,
                    });
                }

                try {
                    await lockInProposal(proposer, proposeId, {
                        governanceInstance,
                    });
                } catch (err) {
                    if (expectRevert(err.message, errorMessage)) return;
                    assert.fail(`fail to lock in proposal: ${err.message}`);
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });
    });

    describe('applyProposal', () => {
        [
            {
                title:
                    'lock in a proposal without a vote opposed to it, and then finish the main voting period',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 14 * DAYS,
            },
            {
                title: '',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: true,
                        amountE0: 2000,
                    },
                ],
                timeToApply: 14 * DAYS,
            },
            {
                title: '',
                errorMessage: 'the proposal is denied by majority of vote',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: false,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: false,
                        amountE0: 2000,
                    },
                ],
                timeToApply: 14 * DAYS,
            },
            {
                title: '',
                errorMessage: 'the proposal is denied by majority of vote',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: false,
                        amountE0: 2000,
                    },
                ],
                timeToApply: 14 * DAYS,
            },
            {
                title: '',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 2000,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: false,
                        amountE0: 1500,
                    },
                ],
                timeToApply: 14 * DAYS,
            },
            {
                title: '',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: false,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: true,
                        amountE0: 2000,
                    },
                ],
                timeToApply: 14 * DAYS,
            },
            {
                title: '',
                errorMessage: 'the proposal is denied by majority of vote',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: false,
                        amountE0: 2000,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                timeToApply: 14 * DAYS,
            },
            {
                title: 'cannot apply a proposal in its main voting period',
                errorMessage: 'the proposal is still under voting period',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 13 * DAYS, // < totalVoteLength
            },
            {
                title: 'cannot apply a expired proposal',
                errorMessage: 'the applicable period of the proposal has expired',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 15 * DAYS, // >= totalVoteLength + expirationLength
            },
        ].forEach((testCase, caseIndex) => {
            const {
                title,
                errorMessage,
                initialTaxTokenSupplyE0,
                votes,
                votesAfterLockedIn,
                timeToApply,
            } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                const lendingTokenInstance = await TestToken.new(
                    'Test ERC20',
                    'TEST',
                    decimalsOfLendingToken
                );

                const {
                    taxTokenInstance,
                    lendingContractInstance,
                } = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    taxTokenConfigs
                );

                const governanceInstance = await deployGovernanceContract(
                    owner,
                    taxTokenInstance,
                    initialCoreParameters
                );

                await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                const { proposeId } = await propose(proposer, newCoreParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });

                for (let i = 0; i < votes.length; i++) {
                    const { accountIndex, approval, amountE0 } = votes[i];
                    const voter = accounts[accountIndex];
                    await prepareTaxToken(voter, amountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });

                    await vote(voter, proposeId, approval, amountE0, {
                        governanceInstance,
                        taxTokenInstance,
                    });
                }

                await lockInProposal(proposer, proposeId, {
                    governanceInstance,
                });

                for (let i = 0; i < votesAfterLockedIn.length; i++) {
                    const { accountIndex, approval, amountE0 } = votesAfterLockedIn[i];
                    const voter = accounts[accountIndex];
                    const mintingAmount = await prepareTaxToken(voter, amountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });

                    await vote(voter, proposeId, approval, amountE0, {
                        governanceInstance,
                        taxTokenInstance,
                    });
                }

                if (timeToApply) {
                    await advanceTime(timeToApply);
                }

                try {
                    await applyProposal(proposer, proposeId, {
                        governanceInstance,
                    });
                } catch (err) {
                    if (expectRevert(err.message, errorMessage)) return;
                    assert.fail(`fail to apply proposal: ${err.message}`);
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });
    });

    describe('withdraw', () => {
        [
            {
                title: 'a participant receives deposit',
                errorMessage: '',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 14 * DAYS,
                withdrawerIndices: [5],
            },
            {
                title: 'a non-participant receives nothing',
                errorMessage: 'no deposit on the proposeId',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 14 * DAYS,
                withdrawerIndices: [6],
            },
            {
                title: 'cannot withdraw twice',
                errorMessage: 'no deposit on the proposeId',
                initialTaxTokenSupplyE0: 20000,
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 1500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 14 * DAYS,
                withdrawerIndices: [5, 5],
            },
        ].forEach((testCase, caseIndex) => {
            const {
                title,
                errorMessage,
                initialTaxTokenSupplyE0,
                votes,
                votesAfterLockedIn,
                timeToApply,
                withdrawerIndices,
            } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                const lendingTokenInstance = await TestToken.new(
                    'Test ERC20',
                    'TEST',
                    decimalsOfLendingToken
                );

                const {
                    taxTokenInstance,
                    lendingContractInstance,
                } = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    taxTokenConfigs
                );

                const governanceInstance = await deployGovernanceContract(
                    owner,
                    taxTokenInstance,
                    initialCoreParameters
                );

                await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                const { proposeId } = await propose(proposer, newCoreParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });

                for (let i = 0; i < votes.length; i++) {
                    const { accountIndex, approval, amountE0 } = votes[i];
                    const voter = accounts[accountIndex];
                    await prepareTaxToken(voter, amountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });

                    await vote(voter, proposeId, approval, amountE0, {
                        governanceInstance,
                        taxTokenInstance,
                    });
                }

                await lockInProposal(proposer, proposeId, {
                    governanceInstance,
                });

                for (let i = 0; i < votesAfterLockedIn.length; i++) {
                    const { accountIndex, approval, amountE0 } = votesAfterLockedIn[i];
                    const voter = accounts[accountIndex];
                    await prepareTaxToken(voter, amountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });

                    await vote(voter, proposeId, approval, amountE0, {
                        governanceInstance,
                        taxTokenInstance,
                    });
                }

                if (timeToApply) {
                    await advanceTime(timeToApply);
                }

                await applyProposal(proposer, proposeId, {
                    governanceInstance,
                });

                for (let i = 0; i < withdrawerIndices.length; i++) {
                    try {
                        await withdraw(accounts[withdrawerIndices[i]], proposeId, {
                            governanceInstance,
                        });
                    } catch (err) {
                        if (expectRevert(err.message, errorMessage)) return;
                        assert.fail(`fail to withdraw: ${err.message}`);
                    }
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });
    });
});

contract('Governance', (accounts) => {
    const [deployer, owner, developer, proposer] = accounts;

    const decimalsOfLendingToken = 18;
    const taxTokenConfigs = {
        decimalsOfStakingRewardToken: 8,
        decimalsOfStakingToken: 8,
        stakingTermInterval: 7 * DAYS,
        developerFundRateE0: 0.05,
        incentiveFundRateE0: 0.05,
        halvingStartLendingValueE0: 10000000,
        maxTotalSupply: 50000000,
        initialMintUnitE0: 1,
        interestE0: 0.005,
        decimalsOfLendingTokenPrice: 8,
        lendingTokenPriceE0: 500,
    };

    const allocation = { [accounts[8]]: 0.4, [accounts[9]]: 0.6 };

    const initialCoreParameters = {
        preVoteLength: 7 * DAYS,
        totalVoteLength: 14 * DAYS,
        expirationLength: 1 * DAYS,
        minVote: 0.05,
        minVoteCore: 0.05,
        minCommit: 0.0001,
    };

    describe('getCoreParameters', () => {
        it.skip('returns correct values');
    });

    describe('getStatus', () => {
        it.skip('returns correct values');
    });

    describe('getProposals', () => {
        const initialTaxTokenSupplyE0 = 20000;
        const proposals = [
            {
                ...initialCoreParameters,
                expirationLength: 2 * DAYS,
            },
            {
                ...initialCoreParameters,
                expirationLength: 3 * DAYS,
            },
        ];
        const offset = 0;
        const limit = 0;
        it('returns correct values', async () => {
            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const {
                taxTokenInstance,
                lendingContractInstance,
            } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                taxTokenConfigs
            );

            const governanceInstance = await deployGovernanceContract(
                owner,
                taxTokenInstance,
                initialCoreParameters
            );

            await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });
            const totalSupply = toE0(await taxTokenInstance.totalSupply(), DECIMALS_OF_TAX_TOKEN);

            const proposeIds = new Array<{ proposeId: string; proposingTime: number }>();
            for (const newCoreParameters of proposals) {
                const { proposeId } = await propose(proposer, newCoreParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });
                const proposingTime = await getBlockTimestampSec();
                proposeIds.unshift({ proposeId, proposingTime });
            }

            const obtainedProposals = await getProposals(offset, limit, { governanceInstance });
            assert.equal(
                obtainedProposals.length,
                proposals.length,
                'the length of the return value of getProposals is 3 * limit'
            );

            for (let i = 0; i < proposeIds.length; i++) {
                const { proposeId, proposingTime } = proposeIds[i];
                const {
                    proposeId: obtainedProposeId,
                    currentApprovalVoteSum,
                    currentDenialVoteSum,
                    appliedMinimumVote,
                    preVoteDeadline,
                    mainVoteDeadline,
                    expiration,
                    lockin,
                    applied,
                } = obtainedProposals[i];
                assert.equal(
                    obtainedProposeId,
                    proposeId,
                    'currentApprovalVoteSum differ from expected'
                );
                assert.equal(
                    currentApprovalVoteSum.toString(10),
                    totalSupply.times(initialCoreParameters.minCommit).toString(10),
                    'currentApprovalVoteSum differ from expected'
                );
                assert.equal(
                    currentDenialVoteSum.toString(10),
                    '0',
                    'currentDenialVoteSum differ from expected'
                );
                assert.equal(
                    appliedMinimumVote.toString(10),
                    totalSupply.times(initialCoreParameters.minVoteCore).toString(10),
                    'appliedMinimumVote differ from expected'
                );
                assert.equal(
                    preVoteDeadline,
                    proposingTime + initialCoreParameters.preVoteLength,
                    'preVoteDeadline differ from expected'
                );
                assert.equal(
                    mainVoteDeadline,
                    proposingTime + initialCoreParameters.totalVoteLength,
                    'mainVoteDeadline differ from expected'
                );
                assert.equal(
                    expiration,
                    initialCoreParameters.expirationLength,
                    'expiration differ from expected'
                );
                assert.equal(lockin, false, 'lockin differ from expected');
                assert.equal(applied, false, 'applied differ from expected');
            }
        });
    });

    describe('getUserStatus', () => {
        it.skip('returns correct values');
    });
});
