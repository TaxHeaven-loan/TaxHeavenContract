import { Test } from 'mocha';
import { CurrencyConvertOracleInstance, TestOracleInstance } from '../../types/truffle-contracts';
import testCases from './testCases';

const TestOracle = artifacts.require('TestOracle');
const CurrencyConvertOracle = artifacts.require('CurrencyConvertOracle');

contract('CurrencyConvertOracle', (accounts) => {
    let ETH_USD_oracle: TestOracleInstance;
    let QUOTE_ETH_oracle: TestOracleInstance;
    let currencyConvertOracle: CurrencyConvertOracleInstance;
    testCases.forEach((testCase) => {
        describe(JSON.stringify(testCase), () => {
            beforeEach(async () => {
                ETH_USD_oracle = await TestOracle.new(
                    testCase.ETH_USD.latestAnswer,
                    testCase.ETH_USD.decimals
                );
                QUOTE_ETH_oracle = await TestOracle.new(
                    testCase.QUOTE_ETH.latestAnswer,
                    testCase.QUOTE_ETH.decimals
                );
                currencyConvertOracle = await CurrencyConvertOracle.new(
                    ETH_USD_oracle.address,
                    QUOTE_ETH_oracle.address,
                    testCase.decimals
                );
            });
            describe('latestAnswer', () => {
                it('returns to QUOTE/USD rate', async () => {
                    const latestAnswer = await currencyConvertOracle.latestAnswer();
                    assert.equal(latestAnswer.toNumber(), testCase.convertedAnswer);
                });
            });
            describe('decimals', () => {
                it('returns the value specified by constructor', async () => {
                    const decimals = await currencyConvertOracle.decimals();
                    assert.equal(decimals.toNumber(), testCase.decimals);
                });
            });
        });
    });
});
