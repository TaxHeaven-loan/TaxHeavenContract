import type Web3 from 'web3';
import BigNumber from 'bignumber.js';
import type {
    TestTokenInstance,
    StakingInstance,
    Erc20Instance,
    Erc20Contract,
} from '../../types/truffle-contracts';
import { fromE0, getBlockTimestampSec, toE0, ZERO_ADDRESS } from '../util';

declare const web3: Web3;

type Address = string;

const Erc20 = artifacts.require('ERC20') as Erc20Contract;
const TestToken = artifacts.require('TestToken');
const Staking = artifacts.require('Staking');

/**
 * @example
 *  await deploy(accounts[0], {
 *      decimalsOfStakingRewardToken: 8,
 *      decimalsOfStakingToken: 8,
 *      stakingTermInterval: 7 * DAYS,
 *  });
 */
export const deployStakingContract = async (
    deployer: Address,
    owner: Address,
    configs: {
        stakingTokenInstance: Erc20Instance;
        decimalsOfStakingRewardToken: number;
        stakingTermInterval: number;
    }
): Promise<{
    rewardTokenInstance: TestTokenInstance;

    stakingContractInstance: StakingInstance;
}> => {
    const { stakingTokenInstance, decimalsOfStakingRewardToken, stakingTermInterval } = configs;
    const rewardTokenInstance = await TestToken.new(
        'Test Reward Token',
        'RWD',
        decimalsOfStakingRewardToken,
        { from: deployer }
    );

    const stakingContractInstance = await Staking.new(
        stakingTokenInstance.address,
        owner,
        await getBlockTimestampSec(),
        stakingTermInterval,
        { from: deployer }
    );

    return { rewardTokenInstance, stakingContractInstance };
};

export async function stake(
    account: Address,
    token: string,
    amount: BigNumber.Value,
    configs: {
        stakingContractInstance: StakingInstance;
    }
) {
    const { stakingContractInstance } = configs;
    const stakingTokenAddress = await stakingContractInstance.getStakingTokenAddress();
    const stakingTokenInstance = await Erc20.at(stakingTokenAddress);
    const decimalsOfStakingToken = (await stakingTokenInstance.decimals()).toNumber();
    await stakingTokenInstance.approve(
        stakingContractInstance.address,
        fromE0(amount, decimalsOfStakingToken),
        { from: account }
    );
    await stakingContractInstance.stake(token, fromE0(amount, decimalsOfStakingToken), {
        from: account,
    });
}

export async function getConfigs(
    token: string,
    term: number,
    configs: {
        stakingContractInstance: StakingInstance;
    }
) {
    const { stakingContractInstance } = configs;
    const { '0': startTimestamp, '1': termInterval } = await stakingContractInstance.getTermInfo(
        token,
        term
    );
    return {
        startTimestamp: startTimestamp.toNumber(),
        termInterval: termInterval.toNumber(),
    };
}

export async function getTermInfo(
    token: string,
    term: number,
    configs: {
        stakingContractInstance: StakingInstance;
        decimalsOfRewardToken: number;
        decimalsOfStakingToken: number;
    }
) {
    const { stakingContractInstance, decimalsOfRewardToken, decimalsOfStakingToken } = configs;
    const {
        '0': stakeAdd,
        '1': stakeSum,
        '2': rewardSum,
    } = await stakingContractInstance.getTermInfo(token, term);
    return {
        stakeAdd: toE0(stakeAdd, decimalsOfStakingToken),
        stakeSum: toE0(stakeSum, decimalsOfStakingToken),
        rewardSum: toE0(rewardSum, decimalsOfRewardToken),
    };
}

export async function getTokenInfo(
    address: string,
    configs: {
        stakingContractInstance: StakingInstance;
        decimalsOfRewardToken: number;
        decimalsOfStakingToken: number;
    }
) {
    const {
        '0': currentTerm,
        '1': latestTerm,
        '2': totalRemainingRewards,
        '3': currentReward,
        '4': nextTermRewards,
        '5': currentStaking,
        '6': nextTermStaking,
    } = await configs.stakingContractInstance.getTokenInfo(address);
    return {
        currentTerm: currentTerm.toNumber(),
        latestTerm: latestTerm.toNumber(),
        totalRemainingRewards: toE0(
            totalRemainingRewards.toNumber(),
            configs.decimalsOfRewardToken
        ),
        currentReward: toE0(currentReward, configs.decimalsOfRewardToken),
        nextTermRewards: toE0(nextTermRewards, configs.decimalsOfRewardToken),
        currentStaking: toE0(currentStaking, configs.decimalsOfStakingToken),
        nextTermStaking: toE0(nextTermStaking, configs.decimalsOfStakingToken),
    };
}

export async function getAccountInfo(
    token: string,
    account: string,
    configs: {
        stakingContractInstance: StakingInstance;
        decimalsOfRewardToken: number;
        decimalsOfStakingToken: number;
    }
) {
    const { stakingContractInstance, decimalsOfRewardToken, decimalsOfStakingToken } = configs;
    const {
        '0': userTerm,
        '1': stakeAmount,
        '2': nextAddedStakeAmount,
        '3': currentReward,
        '4': nextLatestTermUserRewards,
        '5': depositAmount,
        '6': withdrawableStakingAmount,
    } = await stakingContractInstance.getAccountInfo(token, account);
    return {
        userTerm: userTerm.toNumber(),
        stakeAmount: toE0(stakeAmount, decimalsOfStakingToken),
        nextAddedStakeAmount: toE0(nextAddedStakeAmount, decimalsOfStakingToken),
        currentReward: toE0(currentReward, decimalsOfRewardToken),
        nextLatestTermUserRewards: toE0(nextLatestTermUserRewards, decimalsOfRewardToken),
        depositAmount: toE0(depositAmount, decimalsOfStakingToken),
        withdrawableStakingAmount: toE0(withdrawableStakingAmount, decimalsOfStakingToken),
    };
}

export async function getBalance(token: string, account: string): Promise<BigNumber> {
    if (token === ZERO_ADDRESS) {
        return new BigNumber(await web3.eth.getBalance(account));
    }
    const erc20 = await Erc20.at(token);
    return new BigNumber((await erc20.balanceOf(account)).toString());
}

export const transferWei = (sender: string, receiver: string, amount: BigNumber.Value) => {
    return web3.eth.sendTransaction({
        from: sender,
        to: receiver,
        value: fromE0(amount, 0),
        gasPrice: 0,
    });
};

export async function transferToken(
    token: string,
    sender: string,
    receiver: string,
    amount: BigNumber.Value
) {
    if (token === ZERO_ADDRESS) {
        await transferWei(sender, receiver, amount);
    } else {
        const erc20 = await Erc20.at(token);
        await erc20.transfer(receiver, fromE0(amount, 0), { from: sender });
    }
}
