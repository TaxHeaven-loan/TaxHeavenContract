import BigNumber from 'bignumber.js';
import type {
    Erc20Instance,
    GovernanceInstance,
    TaxTokenInstance,
} from '../../../types/truffle-contracts';
import { Address, DECIMALS_OF_TAX_TOKEN, fromE0, toE0, ZERO_ADDRESS } from '../../util';
import { vote, lockInProposal, withdraw, getCoreParameters } from '../util';
import type { DelistParameter } from '../util';
import { stake } from '../../staking/util';
import { getStatus, getUserStatus } from '../../governance/util';

const OracleInterface = artifacts.require('OracleInterface');
const TaxToken = artifacts.require('TaxToken');
const Staking = artifacts.require('Staking');
const Lending = artifacts.require('Lending');

export const LogProposeDelistWhiteList = 'LogProposeDelistWhiteList';

export interface LogProposeDelistWhiteListType extends Truffle.TransactionLog {
    event: typeof LogProposeDelistWhiteList;
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

export function isLogProposeDelistWhiteListType(log: any): log is LogProposeDelistWhiteListType {
    return log.event === LogProposeDelistWhiteList;
}

export async function proposeUnregisterWhitelist(
    account: Address,
    delistParameter: DelistParameter,
    configs: {
        governanceInstance: GovernanceInstance;
        taxTokenInstance: TaxTokenInstance;
        lendingTokenAddress?: Address;
    }
): Promise<{
    proposeId: string;
}> {
    const { governanceInstance, taxTokenInstance, lendingTokenAddress } = configs;
    const { tokenAddress } = delistParameter;

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
    const res = await governanceInstance.proposeDelistWhitelist(tokenAddress, { from: account });

    const targetLogs = res.logs.filter(isLogProposeDelistWhiteListType);
    if (targetLogs.length === 0) {
        throw new Error('the log of LogProposeUpdateCoreParameters event was not emitted');
    }

    const { proposeId } = targetLogs[0].args;
    return { proposeId };
}

export const voteForUnregisterWhitelist = vote;

export const lockInForUnregisterWhitelist = lockInProposal;

export async function applyUnregisterWhitelistProposal(
    account: Address,
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    await governanceInstance.applyGovernanceForDelistWhitelist(proposeId, { from: account });
}

export const withdrawForUnregisterWhitelist = withdraw;

export const getUserStatusUnregisterWhitelist = getUserStatus;

export const getStatusUnregisterWhitelist = getStatus;

export async function getInfoUnregisterWhitelist(
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
): Promise<DelistParameter> {
    const { governanceInstance } = configs;
    const tokenAddress = await governanceInstance.getInfoDelistWhitelist(proposeId);
    return {
        tokenAddress: tokenAddress,
    };
}
