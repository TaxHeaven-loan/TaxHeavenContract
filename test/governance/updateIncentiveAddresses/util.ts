import BigNumber from 'bignumber.js';
import type {
    Erc20Instance,
    GovernanceInstance,
    TaxTokenInstance,
} from '../../../types/truffle-contracts';
import { Address, DECIMALS_OF_TAX_TOKEN, fromE0, toE0, ZERO_ADDRESS } from '../../util';
import { vote, lockInProposal, withdraw, getCoreParameters } from '../util';
import type { IncentiveFundParameter } from '../util';
import { stake } from '../../staking/util';
import { getStatus, getUserStatus } from '../../governance/util';

const OracleInterface = artifacts.require('OracleInterface');
const TaxToken = artifacts.require('TaxToken');
const Staking = artifacts.require('Staking');
const Lending = artifacts.require('Lending');

const decimalsOfFundRate = 8;

export const LogProposeUpdateIncentive = 'LogProposeUpdateIncentive';

export interface LogProposeUpdateIncentiveType extends Truffle.TransactionLog {
    event: typeof LogProposeUpdateIncentive;
    args: {
        /* bytes32 indexed */ proposeId: string;
        /* uint256 */ preVoteLength: BN;
        /* uint256 */ totalVoteLength: BN;
        /* uint256 */ expirationLength: BN;
        /* uint256 */ minVote: BN;
        /* uint256 */ minVoteCore: BN;
        /* uint256 */ minCommit: BN;
        /* uint256 */ preVoteDeadline: BN;
        /* uint256 */ mainVoteDeadline: BN;
    };
}

export function isLogProposeUpdateIncentiveType(log: any): log is LogProposeUpdateIncentiveType {
    return log.event === LogProposeUpdateIncentive;
}

export async function proposeUpdateIncentiveFund(
    account: Address,
    incentiveFundParameter: IncentiveFundParameter,
    configs: {
        governanceInstance: GovernanceInstance;
        taxTokenInstance: TaxTokenInstance;
        lendingTokenAddress?: Address;
    }
): Promise<{
    proposeId: string;
}> {
    const { governanceInstance, taxTokenInstance, lendingTokenAddress } = configs;
    const { allocation } = incentiveFundParameter;

    const totalSupply = toE0(await taxTokenInstance.totalSupply(), DECIMALS_OF_TAX_TOKEN);
    const { minimumCommitE0 } = await getCoreParameters({ governanceInstance });
    const appliedMinCommitE0 = totalSupply.times(minimumCommitE0);
    const lendingAddress = await taxTokenInstance.getLendingAddress();
    const lendingInstance = await Lending.at(lendingAddress);
    const stakingContractAddress = await lendingInstance.getStakingAddress();
    const stakingContractInstance = await Staking.at(stakingContractAddress);
    await stake(account, lendingTokenAddress ?? ZERO_ADDRESS, appliedMinCommitE0, {
        stakingContractInstance,
    });
    const res = await governanceInstance.proposeUpdateIncentiveFund(
        Object.keys(allocation),
        Object.values(allocation).map((v) => fromE0(v, decimalsOfFundRate)),
        { from: account }
    );

    const targetLogs = res.logs.filter(isLogProposeUpdateIncentiveType);
    if (targetLogs.length === 0) {
        throw new Error('the log of LogProposeUpdateCoreParameters event was not emitted');
    }

    const { proposeId } = targetLogs[0].args;
    return { proposeId };
}

export const voteForUpdateIncentiveFund = vote;

export const lockInForUpdateIncentiveFund = lockInProposal;

export async function applyIncentiveFundProposal(
    account: Address,
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    await governanceInstance.applyGovernanceForUpdateIncentive(proposeId, { from: account });
}

export const withdrawForUpdateIncentiveFund = withdraw;

export const getUserStatusUpdateIncentiveFund = getUserStatus;

export const getStatusUpdateIncentiveFund = getStatus;

export async function getInfoUpdateIncentiveFund(
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
): Promise<IncentiveFundParameter> {
    const { governanceInstance } = configs;
    const {
        '0': incentiveAddresses,
        '1': incentiveAllocation,
    } = await governanceInstance.getInfoUpdateIncentive(proposeId);
    return {
        allocation: incentiveAddresses.reduce((acc, account, i) => {
            acc[account] = toE0(incentiveAllocation[i], decimalsOfFundRate).toNumber();
            return acc;
        }, {}),
    };
}
