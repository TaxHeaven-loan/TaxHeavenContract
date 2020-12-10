import BigNumber from 'bignumber.js';
import type {
    LendingInstance,
    TestTokenInstance,
    TaxTokenInstance,
} from '../../types/truffle-contracts';
import { DECIMALS_OF_TAX_TOKEN, Address, fromE0, toE0, ZERO_ADDRESS } from '../util';
import { prepareTestToken, deposit as depositForLending } from '../lending/util';

const OracleInterface = artifacts.require('OracleInterface');
const TestToken = artifacts.require('TestToken');
const TaxToken = artifacts.require('TaxToken');

/**
 * @param account is the receiver address.
 * @param amountE0 is tax token amount to receive.
 * @param configs is the target lending contract and lending token instance.
 * @return minted tax token amount actually.
 */
export const prepareTaxToken = async (
    account: Address,
    amountE0: BigNumber.Value,
    configs: {
        lendingContractInstance: LendingInstance;
        lendingTokenAddress: string;
    }
): Promise<BigNumber> => {
    const { lendingContractInstance, lendingTokenAddress } = configs;

    const taxTokenAddress = await lendingContractInstance.getTaxTokenAddress();
    const taxTokenInstance = await TaxToken.at(taxTokenAddress);
    const { developerFundRateE0, incentiveFundRateE0 } = await getConfigs({ taxTokenInstance });
    const totalFundRateE0 = developerFundRateE0.plus(incentiveFundRateE0);
    const lendingTokenPriceOracleAddress = await taxTokenInstance.getOracleAddress(
        lendingTokenAddress
    );
    const lendingTokenPriceOracleInstance = await OracleInterface.at(
        lendingTokenPriceOracleAddress
    );
    const decimalsOfLendingTokenPrice = (
        await lendingTokenPriceOracleInstance.decimals()
    ).toNumber();
    const lendingTokenPriceE0 = toE0(
        await lendingTokenPriceOracleInstance.latestAnswer(),
        decimalsOfLendingTokenPrice
    );
    const mintUnitE0 = toE0(await taxTokenInstance.getMintUnit(), DECIMALS_OF_TAX_TOKEN);

    // Try to obtain (amountE0 + 1) tax token to calculate sufficient deposit amount.
    const depositAmountE0 = new BigNumber(amountE0)
        .plus(1)
        .div(mintUnitE0.times(lendingTokenPriceE0).times(new BigNumber(1).minus(totalFundRateE0)));

    if (lendingTokenAddress !== ZERO_ADDRESS) {
        const lendingTokenInstance = await TestToken.at(lendingTokenAddress);
        await prepareTestToken(account, depositAmountE0, {
            tokenInstance: lendingTokenInstance,
        });
    }

    const getTaxTokenBalance = async (account: Address) => {
        const balance = await taxTokenInstance.balanceOf(account);
        return toE0(balance, DECIMALS_OF_TAX_TOKEN);
    };

    const beforeTaxTokenBalanceOfLender = await getTaxTokenBalance(account);

    await depositForLending(account, depositAmountE0, {
        lendingContractInstance,
        lendingTokenAddress,
    });

    const afterTaxTokenBalanceOfLender = await getTaxTokenBalance(account);
    const mintingAmountE0 = afterTaxTokenBalanceOfLender.minus(beforeTaxTokenBalanceOfLender);
    return mintingAmountE0;
};

export async function getConfigs(configs: { taxTokenInstance: TaxTokenInstance }) {
    const { taxTokenInstance } = configs;
    const {
        '0': maxTotalSupply,
        '1': halvingStartLendValueE0,
        '2': initialMintUnit,
        '3': developerFundRateE8,
        '4': incentiveFundRateE8,
    } = await taxTokenInstance.getConfigs();
    return {
        maxTotalSupply: toE0(maxTotalSupply, DECIMALS_OF_TAX_TOKEN),
        halvingStartLendValueE0: toE0(halvingStartLendValueE0, 0),
        initialMintUnit: toE0(initialMintUnit, DECIMALS_OF_TAX_TOKEN),
        developerFundRateE0: toE0(developerFundRateE8, 8),
        incentiveFundRateE0: toE0(incentiveFundRateE8, 8),
    };
}

export async function getIncentiveFundAddresses(configs: { taxTokenInstance: TaxTokenInstance }) {
    const { taxTokenInstance } = configs;
    const {
        '0': incentiveFundAddresses,
        '1': incentiveFundAllocationE8,
    } = await taxTokenInstance.getIncentiveFundAddresses();
    return {
        incentiveFundAddresses,
        incentiveFundAllocationE0: incentiveFundAllocationE8.map((v) => toE0(v, 8)),
    };
}

export default {
    getConfigs,
    getIncentiveFundAddresses,
};
