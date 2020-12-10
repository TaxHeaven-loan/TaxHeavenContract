import BigNumber from 'bignumber.js';
import { DAYS, DECIMALS_OF_TAX_TOKEN, expectRevert, fromE0, toE0, ZERO_ADDRESS } from '../util';
import type { Address } from '../util';
import {
    prepareTestToken,
    deployLendingContract,
    deployLendingContractWithLendingToken,
    deposit,
    withdraw,
    borrowFrom,
    repayTo,
} from './util';
import testCases from './testCases';
import { getBalance } from '../staking/util';

const decimalsOfTaxToken = DECIMALS_OF_TAX_TOKEN;

const TestToken = artifacts.require('TestToken');

const prepareLendingToken = prepareTestToken;

contract('Lending', (accounts) => {
    const [deployer, owner, developer, incentiveReceiver, incentiveReceiver2] = accounts;
    const lender = accounts[5];
    const borrower = accounts[5];
    const lender2 = accounts[6];
    const borrower2 = accounts[6];

    const decimalsOfLendingToken = 18;
    const allocation = { [incentiveReceiver]: 0.4, [incentiveReceiver2]: 0.6 };
    const initialMintUnitE0 = 1;
    const interestE0 = 0.005;

    const lendingConfigs = {
        decimalsOfStakingRewardToken: 8,
        decimalsOfStakingToken: 8,
        stakingTermInterval: 7 * DAYS,
        developerFundRateE0: 0.05,
        incentiveFundRateE0: 0.05,
        halvingStartLendingValueE0: 10000000,
        maxTotalSupply: 50000000,
        initialMintUnitE0,
        interestE0,
        decimalsOfLendingTokenPrice: 8,
        lendingTokenPriceE0: 500,
    };

    const totalFundRateE0 = lendingConfigs.developerFundRateE0 + lendingConfigs.incentiveFundRateE0;

    describe('deposit', () => {
        it('works well when the lending token has not been registered', async () => {
            const approvalAmountE0 = 10000;
            const depositAmountE0 = 10000;

            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const { taxTokenInstance, lendingContractInstance } = await deployLendingContract(
                deployer,
                owner,
                developer,
                allocation,
                lendingConfigs
            );

            const getLendingTokenBalance = async (account: Address) => {
                const balance = await lendingTokenInstance.balanceOf(account);
                return toE0(balance, decimalsOfLendingToken);
            };

            const getTaxTokenBalance = async (account: Address) => {
                const balance = await taxTokenInstance.balanceOf(account);
                return toE0(balance, decimalsOfTaxToken);
            };

            await prepareLendingToken(lender, approvalAmountE0, {
                tokenInstance: lendingTokenInstance,
            });

            const beforeLendingTokenBalanceOfLender = await getLendingTokenBalance(lender);
            const beforeTaxTokenBalanceOfLender = await getTaxTokenBalance(lender);

            await deposit(lender, depositAmountE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
                approvalAmountE0,
            });

            const afterLendingTokenBalanceOfLender = await getLendingTokenBalance(lender);
            const afterTaxTokenBalanceOfLender = await getTaxTokenBalance(lender);
            assert.equal(
                beforeLendingTokenBalanceOfLender
                    .minus(afterLendingTokenBalanceOfLender)
                    .toString(10),
                depositAmountE0.toString(10),
                'the lending token balance of lender differ from expected'
            );

            const lendingTokenPriceE0 = 0;
            const mintingTaxTokenAmountE0 = new BigNumber(depositAmountE0)
                .times(initialMintUnitE0)
                .times(lendingTokenPriceE0)
                .times(1 - totalFundRateE0);
            assert.equal(
                afterTaxTokenBalanceOfLender.minus(beforeTaxTokenBalanceOfLender).toString(10),
                mintingTaxTokenAmountE0.toString(10),
                'the tax token balance of lender differ from expected'
            );
        });

        it('gives tax token to a lender if the lending token has been registered', async () => {
            const approvalAmountE0 = 10000;
            const depositAmountE0 = 10000;

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
                lendingConfigs
            );

            const getLendingTokenBalance = async (account: Address) => {
                const balance = await lendingTokenInstance.balanceOf(account);
                return toE0(balance, decimalsOfLendingToken);
            };

            const getTaxTokenBalance = async (account: Address) => {
                const balance = await taxTokenInstance.balanceOf(account);
                return toE0(balance, decimalsOfTaxToken);
            };

            await prepareLendingToken(lender, approvalAmountE0, {
                tokenInstance: lendingTokenInstance,
            });

            const beforeLendingTokenBalanceOfLender = await getLendingTokenBalance(lender);
            const beforeTaxTokenBalanceOfLender = await getTaxTokenBalance(lender);

            await deposit(lender, depositAmountE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
                approvalAmountE0,
            });

            const afterLendingTokenBalanceOfLender = await getLendingTokenBalance(lender);
            const afterTaxTokenBalanceOfLender = await getTaxTokenBalance(lender);
            assert.equal(
                beforeLendingTokenBalanceOfLender
                    .minus(afterLendingTokenBalanceOfLender)
                    .toString(10),
                depositAmountE0.toString(10),
                'the lending token balance of lender differ from expected'
            );

            const mintingTaxTokenAmountE0 = new BigNumber(depositAmountE0)
                .times(initialMintUnitE0)
                .times(lendingConfigs.lendingTokenPriceE0)
                .times(1 - totalFundRateE0);
            assert.equal(
                afterTaxTokenBalanceOfLender.minus(beforeTaxTokenBalanceOfLender).toString(10),
                mintingTaxTokenAmountE0.toString(10),
                'the tax token balance of lender differ from expected'
            );
        });

        it('gives tax token to a lender if ETH has been registered as lending token', async () => {
            const approvalAmountE0 = 0.1;
            const depositAmountE0 = 0.1;

            const {
                taxTokenInstance,
                lendingContractInstance,
            } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                ZERO_ADDRESS,
                lendingConfigs
            );

            const getLendingTokenBalance = async (account: Address) => {
                const balance = await getBalance(ZERO_ADDRESS, account);
                return toE0(balance, 18);
            };

            const getTaxTokenBalance = async (account: Address) => {
                const balance = await taxTokenInstance.balanceOf(account);
                return toE0(balance, decimalsOfTaxToken);
            };

            const beforeLendingTokenBalanceOfLender = await getLendingTokenBalance(lender);
            const beforeTaxTokenBalanceOfLender = await getTaxTokenBalance(lender);

            await deposit(lender, depositAmountE0, {
                lendingContractInstance,
                lendingTokenAddress: ZERO_ADDRESS,
                approvalAmountE0,
            });

            const afterLendingTokenBalanceOfLender = await getLendingTokenBalance(lender);
            const afterTaxTokenBalanceOfLender = await getTaxTokenBalance(lender);
            assert.equal(
                beforeLendingTokenBalanceOfLender
                    .minus(afterLendingTokenBalanceOfLender)
                    .toString(10),
                depositAmountE0.toString(10),
                'the lending token balance of lender differ from expected'
            );

            const mintingTaxTokenAmountE0 = new BigNumber(depositAmountE0)
                .times(initialMintUnitE0)
                .times(lendingConfigs.lendingTokenPriceE0)
                .times(1 - totalFundRateE0);
            assert.equal(
                afterTaxTokenBalanceOfLender.minus(beforeTaxTokenBalanceOfLender).toString(10),
                mintingTaxTokenAmountE0.toString(10),
                'the tax token balance of lender differ from expected'
            );
        });
    });

    describe('withdraw', () => {
        testCases.simpleWithdrawScenario.forEach((testCase, caseIndex) => {
            const { title, errorMessage, depositAmountE0, withdrawingAmountE0 } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                const lendingTokenInstance = await TestToken.new(
                    'Test ERC20',
                    'TEST',
                    decimalsOfLendingToken
                );

                const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    lendingConfigs
                );

                await prepareLendingToken(lender, depositAmountE0, {
                    tokenInstance: lendingTokenInstance,
                });

                await deposit(lender, depositAmountE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                try {
                    await withdraw(lender, withdrawingAmountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });
                } catch (err) {
                    if (expectRevert(err.message, errorMessage)) return;
                    assert.fail(`fail to withdraw: ${err.message}`);
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });
    });

    describe('borrow', () => {
        testCases.simpleBorrowScenario.forEach((testCase, caseIndex) => {
            const { title, errorMessage, depositAmountE0, borrowingAmountE0 } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                const lendingTokenInstance = await TestToken.new(
                    'Test ERC20',
                    'TEST',
                    decimalsOfLendingToken
                );

                const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    lendingConfigs
                );

                await prepareLendingToken(lender, depositAmountE0, {
                    tokenInstance: lendingTokenInstance,
                });

                await deposit(lender, depositAmountE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                try {
                    await borrowFrom(borrower, borrowingAmountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });
                } catch (err) {
                    if (expectRevert(err.message, errorMessage)) return;
                    assert.fail(`fail to borrow: ${err.message}`);
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });
    });

    describe('repay', () => {
        testCases.simpleRepayScenario.forEach((testCase, caseIndex) => {
            const {
                title,
                errorMessage,
                depositAmountE0,
                borrowingAmountE0,
                repayingAmountE0,
            } = testCase;
            it(title || `works well (simple scenario case ${caseIndex})`, async () => {
                const lendingTokenInstance = await TestToken.new(
                    'Test ERC20',
                    'TEST',
                    decimalsOfLendingToken
                );

                const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                    deployer,
                    owner,
                    developer,
                    allocation,
                    lendingTokenInstance.address,
                    lendingConfigs
                );

                await prepareLendingToken(lender, depositAmountE0, {
                    tokenInstance: lendingTokenInstance,
                });

                await prepareLendingToken(borrower, depositAmountE0, {
                    tokenInstance: lendingTokenInstance,
                });

                await deposit(lender, depositAmountE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                await borrowFrom(borrower, borrowingAmountE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });

                try {
                    await repayTo(borrower, repayingAmountE0, {
                        lendingContractInstance,
                        lendingTokenAddress: lendingTokenInstance.address,
                    });
                } catch (err) {
                    if (expectRevert(err.message, errorMessage)) return;
                    assert.fail(`fail to repay: ${err.message}`);
                }

                assert.ok(
                    errorMessage === '',
                    `an error was expected, but it was successful: ${errorMessage}`
                );
            });
        });

        it('cannot be executed without borrowing sufficiently', async () => {
            const interestE0 = 0.005;
            const depositAmountE0 = 10000;
            const remainingCreditE0 = new BigNumber(depositAmountE0).times(1 - interestE0);
            const tooMuchRepayErrMes = 'too much repay';

            const errorMessage = tooMuchRepayErrMes;
            const borrowingAmountE0 = remainingCreditE0;
            const repayingAmountE0 = depositAmountE0;

            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                lendingConfigs
            );

            await prepareLendingToken(lender, depositAmountE0, {
                tokenInstance: lendingTokenInstance,
            });

            await prepareLendingToken(borrower, depositAmountE0, {
                tokenInstance: lendingTokenInstance,
            });

            await deposit(lender, depositAmountE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            await borrowFrom(borrower, borrowingAmountE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            try {
                await repayTo(borrower, repayingAmountE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });
            } catch (err) {
                if (expectRevert(err.message, errorMessage)) return;
                assert.fail(`fail to repay: ${err.message}`);
            }

            assert.fail(`an error was expected, but it was successful: ${errorMessage}`);
        });
    });

    describe('getRemainingCredit', () => {
        it('is increased when a lender deposited', async () => {
            const depositAmountE0 = 10000;

            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                lendingConfigs
            );

            await prepareLendingToken(lender, depositAmountE0, {
                tokenInstance: lendingTokenInstance,
            });

            await deposit(lender, depositAmountE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            const expectedRemainingCreditE0 = new BigNumber(depositAmountE0).times(1 - interestE0);
            const remainingCreditE0 = toE0(
                await lendingContractInstance.getRemainingCredit(
                    lendingTokenInstance.address,
                    lender
                ),
                decimalsOfLendingToken
            );
            assert.equal(
                remainingCreditE0.toString(10),
                expectedRemainingCreditE0.toString(10),
                'the remaining credit amount differ from expected'
            );
        });

        it('is increased when a lender deposited twice', async () => {
            const depositAmountE0 = 15000;

            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                lendingConfigs
            );

            await prepareLendingToken(lender, depositAmountE0 * 2, {
                tokenInstance: lendingTokenInstance,
            });

            for (let i = 0; i < 2; i++) {
                await deposit(lender, depositAmountE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });
            }

            const expectedRemainingCreditE0 = new BigNumber(depositAmountE0 * 2).times(
                1 - interestE0
            );
            const remainingCreditE0 = toE0(
                await lendingContractInstance.getRemainingCredit(
                    lendingTokenInstance.address,
                    lender
                ),
                decimalsOfLendingToken
            );
            assert.equal(
                remainingCreditE0.toString(10),
                expectedRemainingCreditE0.toString(10),
                'the remaining credit amount differ from expected'
            );
        });
    });

    describe('getTotalLending', () => {
        it('is increased when a lender deposited', async () => {
            const depositAmountE0 = 10000;

            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                lendingConfigs
            );

            await prepareLendingToken(lender, depositAmountE0, {
                tokenInstance: lendingTokenInstance,
            });

            await deposit(lender, depositAmountE0, {
                lendingContractInstance,
                lendingTokenAddress: lendingTokenInstance.address,
            });

            const expectedRemainingCreditE0 = new BigNumber(depositAmountE0).times(1 - interestE0);
            const remainingCreditE0 = toE0(
                await lendingContractInstance.getTotalLending(lendingTokenInstance.address),
                decimalsOfLendingToken
            );
            assert.equal(
                remainingCreditE0.toString(10),
                expectedRemainingCreditE0.toString(10),
                'the remaining credit amount differ from expected'
            );
        });

        it('is also increased when the second lender deposited', async () => {
            const depositAmountE0 = 15000;

            const lendingTokenInstance = await TestToken.new(
                'Test ERC20',
                'TEST',
                decimalsOfLendingToken
            );

            const { lendingContractInstance } = await deployLendingContractWithLendingToken(
                deployer,
                owner,
                developer,
                allocation,
                lendingTokenInstance.address,
                lendingConfigs
            );

            const lenders = [lender, lender2];
            for (let i = 0; i < 2; i++) {
                await prepareLendingToken(lenders[i], depositAmountE0, {
                    tokenInstance: lendingTokenInstance,
                });

                await deposit(lenders[i], depositAmountE0, {
                    lendingContractInstance,
                    lendingTokenAddress: lendingTokenInstance.address,
                });
            }

            const expectedRemainingCreditE0 = new BigNumber(depositAmountE0 * 2).times(
                1 - interestE0
            );
            const remainingCreditE0 = toE0(
                await lendingContractInstance.getTotalLending(lendingTokenInstance.address),
                decimalsOfLendingToken
            );
            assert.equal(
                remainingCreditE0.toString(10),
                expectedRemainingCreditE0.toString(10),
                'the remaining credit amount differ from expected'
            );
        });
    });

    describe('getTotalBorrowing', () => {
        it.skip('is increased when a borrower borrowed');
        it.skip('is also increased when the second borrower borrowed');
    });

    describe('getLenderAccount', () => {
        it.skip('is increased when a lender deposited');
        it.skip('is decreased when a lender withdraw');
        it.skip('is not decreased when a borrower borrowed');
    });

    describe('getBorrowerAccount', () => {
        it.skip('is increased when a borrower borrowed');
        it.skip('is decreased when a borrower repaid');
    });

    describe('getTvl', () => {
        it.skip('returns the same value as `getTotalLending`');
    });
});
