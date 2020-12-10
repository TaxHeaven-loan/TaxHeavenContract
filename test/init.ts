import { TestTokenInstance, StakingInstance } from '../types/truffle-contracts';
import { getBlockTimestampSec } from './util';

const TestRewardToken = artifacts.require('TestToken');
const TestStakingToken = artifacts.require('TestToken');
const Staking = artifacts.require('Staking');

export interface ContractInterfaces {
    rewardTokenContract: TestTokenInstance;
    rewardToken2Contract: TestTokenInstance;
    stakingTokenContract: TestTokenInstance;
    stakingContract: StakingInstance;
}

export async function init(config: {
    deployer: string;
    owner?: string;
    interval: number;
}): Promise<ContractInterfaces> {
    const { deployer, owner, interval } = config;
    const rewardTokenContract = await TestRewardToken.new('Reward', 'RW', 8);
    const rewardToken2Contract = await TestRewardToken.new('Reward2', 'RW2', 6);
    const stakingTokenContract = await TestStakingToken.new('Staking', 'ST', 8);
    const stakingContract = await Staking.new(
        stakingTokenContract.address,
        owner ?? deployer,
        await getBlockTimestampSec(),
        interval,
        { from: deployer }
    );
    return {
        rewardTokenContract,
        rewardToken2Contract,
        stakingTokenContract,
        stakingContract,
    };
}
