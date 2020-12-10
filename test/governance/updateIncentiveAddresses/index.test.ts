import BigNumber from 'bignumber.js';

import { advanceTime, DAYS, expectRevert, fromE0, ZERO_ADDRESS } from '../../util';
import { deployGovernanceContract, vote, lockInProposal, withdraw, getStatus } from '../util';
import {
    proposeUpdateIncentiveFund,
    applyIncentiveFundProposal,
    getInfoUpdateIncentiveFund,
} from './util';
import { prepareTaxToken } from '../../taxToken/util';
import { deployLendingContractWithLendingToken } from '../../lending/util';
import { applyRegisterWhitelistProposal } from '../registerWhitelist/util';
import { applyUnregisterWhitelistProposal } from '../unregisterWhitelist/util';
import { applyCoreParameterProposal } from '../updateCoreParameters/util';
import type {
    GovernanceInstance,
    LendingInstance,
    TaxTokenInstance,
    TestTokenInstance,
} from '../../../types/truffle-contracts';

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
        minVote: new BigNumber(0.05),
        minVoteCore: new BigNumber(0.1),
        minCommit: new BigNumber(0.0001),
    };

    describe('proposeUpdateIncentiveFund', () => {
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

            const newParameters = {
                allocation: { [accounts[7]]: 0.3, [accounts[8]]: 0.4, [accounts[9]]: 0.3 },
            };

            await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            let proposeId: string;
            try {
                const res = await proposeUpdateIncentiveFund(proposer, newParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });
                proposeId = res.proposeId;
            } catch (err) {
                if (expectRevert(err.message, errorMessage)) return;
                assert.fail(`fail to propose: ${err.message}`);
            }

            assert.ok(proposeId !== '0x'.padEnd(66, '0'), 'proposal ID must not be non-zero');

            assert.ok(
                errorMessage === '',
                `an error was expected, but it was successful: ${errorMessage}`
            );
        });
    });

    describe('applyGovernanceForUpdateIncentive', () => {
        const initialTaxTokenSupplyE0 = 20000;
        let lendingTokenInstance: TestTokenInstance;
        let taxTokenInstance: TaxTokenInstance;
        let lendingContractInstance: LendingInstance;
        let governanceInstance: GovernanceInstance;
        let proposeId: string;

        beforeEach(async () => {
            lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            {
                const res = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    taxTokenConfigs
                );
                taxTokenInstance = res.taxTokenInstance;
                lendingContractInstance = res.lendingContractInstance;
            }

            governanceInstance = await deployGovernanceContract(
                owner,
                taxTokenInstance,
                initialCoreParameters
            );

            await prepareTaxToken(proposer, initialTaxTokenSupplyE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            const newParameters = {
                allocation: { [accounts[7]]: 0.3, [accounts[8]]: 0.4, [accounts[9]]: 0.3 },
            };

            {
                const res = await proposeUpdateIncentiveFund(proposer, newParameters, {
                    governanceInstance,
                    taxTokenInstance,
                });

                proposeId = res.proposeId;
            }
        });

        [
            {
                title:
                    'lock in a proposal without a vote opposed to it, and then finish the main voting period',
                errorMessage: '',
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 2500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 14 * DAYS,
                withdrawerIndices: [5],
            },
            {
                title: '',
                errorMessage: '',
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 2500,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: true,
                        amountE0: 3000,
                    },
                ],
                timeToApply: 14 * DAYS,
                withdrawerIndices: [6],
            },
            {
                title: '',
                errorMessage: 'the proposal is denied by majority of vote',
                votes: [
                    {
                        accountIndex: 5,
                        approval: false,
                        amountE0: 2500,
                    },
                ],
                votesAfterLockedIn: [
                    {
                        accountIndex: 6,
                        approval: false,
                        amountE0: 3000,
                    },
                ],
                timeToApply: 14 * DAYS,
                withdrawerIndices: [5],
            },
            {
                title: 'cannot apply a proposal in its main voting period',
                errorMessage: 'the proposal is still under voting period',
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 2500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 13 * DAYS, // < totalVoteLength
                withdrawerIndices: [],
            },
            {
                title: 'cannot apply a expired proposal',
                errorMessage: 'the applicable period of the proposal has expired',
                votes: [
                    {
                        accountIndex: 5,
                        approval: true,
                        amountE0: 2500,
                    },
                ],
                votesAfterLockedIn: [],
                timeToApply: 15 * DAYS, // >= totalVoteLength + expirationLength
                withdrawerIndices: [],
            },
        ].forEach((testCase, caseIndex) => {
            const {
                title,
                errorMessage,
                votes,
                votesAfterLockedIn,
                timeToApply,
                withdrawerIndices,
            } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                assert.ok(proposeId !== '0x'.padEnd(66, '0'), 'proposal ID must not be non-zero');

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
                    await applyIncentiveFundProposal(proposer, proposeId, {
                        governanceInstance,
                    });
                } catch (err) {
                    if (expectRevert(err.message, errorMessage)) return;
                    assert.fail(`fail to apply proposal: ${err.message}`);
                }

                for (let i = 0; i < withdrawerIndices.length; i++) {
                    await withdraw(accounts[withdrawerIndices[i]], proposeId, {
                        governanceInstance,
                    });
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });

        it(`cannot apply another type of proposal`, async () => {
            const votes = [
                {
                    accountIndex: 5,
                    approval: true,
                    amountE0: 2500,
                },
            ];
            const timeToApply = 14 * DAYS;

            assert.ok(proposeId !== '0x'.padEnd(66, '0'), 'proposal ID must not be non-zero');

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

            if (timeToApply) {
                await advanceTime(timeToApply);
            }

            try {
                await applyRegisterWhitelistProposal(proposer, proposeId, {
                    governanceInstance,
                });
            } catch (err) {
                if (!expectRevert(err.message, 'the propose ID is invalid')) {
                    assert.fail(`fail to apply proposal: ${err.message}`);
                }
            }

            try {
                await applyUnregisterWhitelistProposal(proposer, proposeId, {
                    governanceInstance,
                });
            } catch (err) {
                if (!expectRevert(err.message, 'the propose ID is invalid')) {
                    assert.fail(`fail to apply proposal: ${err.message}`);
                }
            }

            try {
                await applyCoreParameterProposal(proposer, proposeId, {
                    governanceInstance,
                });
            } catch (err) {
                if (!expectRevert(err.message, 'the propose ID is invalid')) {
                    assert.fail(`fail to apply proposal: ${err.message}`);
                }
            }

            try {
                await applyIncentiveFundProposal(proposer, proposeId, {
                    governanceInstance,
                });
            } catch (err) {
                assert.fail(`fail to apply proposal: ${err.message}`);
            }
        });
    });

    describe('getInfoUpdateIncentive', () => {
        const initialTaxTokenSupplyE0 = 20000;

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

            const newParameters = {
                allocation: { [accounts[7]]: 0.3, [accounts[8]]: 0.4, [accounts[9]]: 0.3 },
            };
            const { proposeId } = await proposeUpdateIncentiveFund(proposer, newParameters, {
                governanceInstance,
                taxTokenInstance,
            });

            const parametersProposal = await getInfoUpdateIncentiveFund(proposeId, {
                governanceInstance,
            });

            assert.deepEqual(
                parametersProposal,
                newParameters,
                'proposal info differ from expected'
            );
        });
    });
});
