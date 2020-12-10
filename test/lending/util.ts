import BigNumber from 'bignumber.js';
import { DECIMALS_OF_TAX_TOKEN, fromE0, toE0, ZERO_ADDRESS } from '../util';
import type {
    TestTokenInstance,
    LendingInstance,
    TaxTokenInstance,
    StakingInstance,
    TestOracleInstance,
    Erc20Contract,
} from '../../types/truffle-contracts';
import { deployStakingContract, getBalance } from '../staking/util';

type Address = string;

const TestOracle = artifacts.require('TestOracle');
const Erc20 = artifacts.require('ERC20') as Erc20Contract;
const Lending = artifacts.require('Lending');
const TaxToken = artifacts.require('TaxToken');

const decimalsOfFundRate = 8;
const decimalsOfDecayRate = 8;

export async function getDecimals(lendingTokenAddress: string): Promise<number> {
    if (lendingTokenAddress === ZERO_ADDRESS) {
        return 18;
    } else {
        const lendingTokenInstance = await Erc20.at(lendingTokenAddress);
        const decimals = await lendingTokenInstance.decimals();
        return decimals.toNumber();
    }
}

export const prepareTestToken = async (
    account: Address,
    amountE0: BigNumber.Value,
    configs: {
        tokenInstance: TestTokenInstance;
    }
) => {
    const { tokenInstance } = configs;
    const decimalsOfLendingToken = (await tokenInstance.decimals()).toNumber();
    await tokenInstance.mint(fromE0(amountE0, decimalsOfLendingToken, BigNumber.ROUND_UP), {
        from: account,
    });
};

/**
 * @example
 *  assert(Object.values(allocation).reduce((acc, value) => acc + value, 0) === 1);
 *  await deployTaxToken(
 *      accounts[0],
 *      accounts[1],
 *      accounts[2],
 *      { [accounts[3]]: 0.4, [accounts[4]]: 0.6 },
 *      {
 *          decimalsOfLendingToken: 18,
 *          developerFundRateE0: 0.05,
 *          incentiveFundRateE0: 0.05,
 *          halvingStartAmountE0: 20000,
 *          halvingDecayRateE0: 0.5,
 *          mintUnitE0: 30,
 *          interestE0: 0.005,
 *      }
 *  );
 */
export const deployLendingContract = async (
    deployer: Address,
    owner: Address,
    developer: Address,
    allocation: Record<Address, BigNumber.Value>,
    configs: {
        decimalsOfStakingRewardToken: number;
        stakingTermInterval: number;
        decimalsOfLendingToken?: number;
        developerFundRateE0: BigNumber.Value;
        incentiveFundRateE0: BigNumber.Value;
        halvingStartLendingValueE0: BigNumber.Value;
        maxTotalSupply: BigNumber.Value;
        initialMintUnitE0: BigNumber.Value;
        interestE0: BigNumber.Value;
    }
): Promise<{
    rewardTokenInstance: TestTokenInstance;
    stakingContractInstance: StakingInstance;
    taxTokenInstance: TaxTokenInstance;
    lendingContractInstance: LendingInstance;
}> => {
    const {
        decimalsOfStakingRewardToken,
        stakingTermInterval,
        developerFundRateE0,
        incentiveFundRateE0,
        halvingStartLendingValueE0,
        maxTotalSupply,
        initialMintUnitE0,
        interestE0,
    } = configs;

    const taxTokenInstance = await TaxToken.new(
        owner,
        developer,
        Object.keys(allocation),
        Object.values(allocation).map((v) => fromE0(v, decimalsOfFundRate)),
        fromE0(developerFundRateE0, decimalsOfFundRate),
        fromE0(incentiveFundRateE0, decimalsOfFundRate),
        ZERO_ADDRESS,
        fromE0(halvingStartLendingValueE0, 0),
        fromE0(maxTotalSupply, DECIMALS_OF_TAX_TOKEN),
        fromE0(initialMintUnitE0, DECIMALS_OF_TAX_TOKEN),
        { from: deployer }
    );

    const { rewardTokenInstance, stakingContractInstance } = await deployStakingContract(
        deployer,
        owner,
        {
            stakingTokenInstance: taxTokenInstance,
            decimalsOfStakingRewardToken,
            stakingTermInterval,
        }
    );

    const lendingContractInstance = await Lending.new(
        taxTokenInstance.address,
        stakingContractInstance.address,
        fromE0(interestE0, 3),
        { from: deployer }
    );
    await taxTokenInstance.updateLendingAddress(lendingContractInstance.address, {
        from: owner,
    });

    return {
        rewardTokenInstance,
        stakingContractInstance,
        taxTokenInstance,
        lendingContractInstance,
    };
};

export const deployLendingContractWithLendingToken = async (
    deployer: Address,
    owner: Address,
    developer: Address,
    allocation: Record<Address, BigNumber.Value>,
    lendingTokenAddress: string,
    configs: {
        decimalsOfStakingRewardToken: number;
        stakingTermInterval: number;
        developerFundRateE0: BigNumber.Value;
        incentiveFundRateE0: BigNumber.Value;
        halvingStartLendingValueE0: BigNumber.Value;
        maxTotalSupply: BigNumber.Value;
        initialMintUnitE0: BigNumber.Value;
        interestE0: BigNumber.Value;
        decimalsOfLendingTokenPrice: number;
        lendingTokenPriceE0: BigNumber.Value;
    }
): Promise<{
    rewardTokenInstance: TestTokenInstance;
    stakingContractInstance: StakingInstance;
    taxTokenInstance: TaxTokenInstance;
    lendingContractInstance: LendingInstance;
    lendingTokenPriceOracleInstance: TestOracleInstance;
}> => {
    const { decimalsOfLendingTokenPrice, lendingTokenPriceE0, ...lendingContractConfigs } = configs;
    const decimalsOfLendingToken = await getDecimals(lendingTokenAddress);
    const {
        rewardTokenInstance,
        stakingContractInstance,
        taxTokenInstance,
        lendingContractInstance,
    } = await deployLendingContract(deployer, owner, developer, allocation, {
        ...lendingContractConfigs,
        decimalsOfLendingToken,
    });

    const lendingTokenPriceOracleInstance = await TestOracle.new(
        fromE0(lendingTokenPriceE0, decimalsOfLendingTokenPrice),
        decimalsOfLendingTokenPrice
    );

    await taxTokenInstance.registerWhitelist(
        lendingTokenAddress,
        lendingTokenPriceOracleInstance.address,
        { from: owner }
    );

    return {
        rewardTokenInstance,
        stakingContractInstance,
        taxTokenInstance,
        lendingContractInstance,
        lendingTokenPriceOracleInstance,
    };
};

export const deposit = async (
    lender: Address,
    depositAmountE0: BigNumber.Value,
    configs: {
        lendingContractInstance: LendingInstance;
        lendingTokenAddress: string;
        approvalAmountE0?: BigNumber.Value;
    }
) => {
    const { lendingContractInstance, lendingTokenAddress } = configs;
    const approvalAmountE0 = configs.approvalAmountE0 ?? depositAmountE0;
    const decimalsOfLendingToken = await getDecimals(lendingTokenAddress);
    const balanceE0 = toE0(await getBalance(lendingTokenAddress, lender), decimalsOfLendingToken);
    if (balanceE0.lt(approvalAmountE0)) {
        throw new Error(
            `insufficient balance: ${balanceE0.toString(10)} < ${approvalAmountE0.toString(10)}`
        );
    }

    if (lendingTokenAddress === ZERO_ADDRESS) {
        await lendingContractInstance.depositEth({
            from: lender,
            value: fromE0(depositAmountE0, 18),
            gasPrice: 0,
        });
    } else {
        const lendingTokenInstance = await Erc20.at(lendingTokenAddress);
        await lendingTokenInstance.approve(
            lendingContractInstance.address,
            fromE0(approvalAmountE0, decimalsOfLendingToken),
            { from: lender }
        );
        await lendingContractInstance.depositErc20(
            lendingTokenAddress,
            fromE0(depositAmountE0, decimalsOfLendingToken),
            { from: lender }
        );
    }
};

export const withdraw = async (
    lender: Address,
    withdrawingAmountE0: BigNumber.Value,
    configs: {
        lendingContractInstance: LendingInstance;
        lendingTokenAddress: string;
    }
) => {
    const { lendingContractInstance, lendingTokenAddress } = configs;
    const decimalsOfLendingToken = await getDecimals(lendingTokenAddress);
    await lendingContractInstance.withdraw(
        lendingTokenAddress,
        fromE0(withdrawingAmountE0, decimalsOfLendingToken),
        { from: lender }
    );
};

export const borrowFrom = async (
    borrower: Address,
    borrowingAmountE0: BigNumber.Value,
    configs: {
        lendingContractInstance: LendingInstance;
        lendingTokenAddress: string;
    }
) => {
    const { lendingContractInstance, lendingTokenAddress } = configs;
    const decimalsOfLendingToken = await getDecimals(lendingTokenAddress);
    await lendingContractInstance.borrow(
        lendingTokenAddress,
        fromE0(borrowingAmountE0, decimalsOfLendingToken),
        { from: borrower }
    );
};

export const repayTo = async (
    borrower: Address,
    repayingAmountE0: BigNumber.Value,
    configs: {
        lendingContractInstance: LendingInstance;
        lendingTokenAddress: string;
        approvalAmountE0?: BigNumber.Value;
    }
) => {
    const { lendingContractInstance, lendingTokenAddress } = configs;
    const approvalAmountE0 = configs.approvalAmountE0 ?? repayingAmountE0;
    const lendingTokenInstance = await Erc20.at(lendingTokenAddress);
    const decimalsOfLendingToken = await getDecimals(lendingTokenAddress);
    const balanceE0 = toE0(await lendingTokenInstance.balanceOf(borrower), decimalsOfLendingToken);
    if (balanceE0.lt(approvalAmountE0)) {
        throw new Error(
            `insufficient balance: ${balanceE0.toString(10)} < ${approvalAmountE0.toString(10)}`
        );
    }
    await lendingTokenInstance.approve(
        lendingContractInstance.address,
        fromE0(approvalAmountE0, decimalsOfLendingToken),
        { from: borrower }
    );
    await lendingContractInstance.repayErc20(
        lendingTokenAddress,
        fromE0(repayingAmountE0, decimalsOfLendingToken),
        { from: borrower }
    );
};

export default {
    deployLendingContract,
    deposit,
    withdraw,
    borrowFrom,
    repayTo,
};
