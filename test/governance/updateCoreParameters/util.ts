import BigNumber from 'bignumber.js';
import type {
    Erc20Instance,
    GovernanceInstance,
    TaxTokenInstance,
} from '../../../types/truffle-contracts';
import { Address, DECIMALS_OF_TAX_TOKEN, fromE0, toE0, ZERO_ADDRESS } from '../../util';
import { vote, lockInProposal, withdraw, getCoreParameters } from '../util';
import type { CoreParameter } from '../util';
import { stake } from '../../staking/util';
import { getStatus, getUserStatus } from '../../governance/util';

const OracleInterface = artifacts.require('OracleInterface');
const TaxToken = artifacts.require('TaxToken');
const Staking = artifacts.require('Staking');
const Lending = artifacts.require('Lending');

export const LogProposeUpdateCoreParameters = 'LogProposeUpdateCoreParameters';

export interface LogProposeUpdateCoreParametersType extends Truffle.TransactionLog {
    event: typeof LogProposeUpdateCoreParameters;
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

export function isLogProposeUpdateCoreParametersType(
    log: any
): log is LogProposeUpdateCoreParametersType {
    return log.event === LogProposeUpdateCoreParameters;
}

export async function proposeUpdateCoreParameters(
    account: Address,
    coreParameter: CoreParameter,
    configs: {
        governanceInstance: GovernanceInstance;
        taxTokenInstance: TaxTokenInstance;
        lendingTokenAddress?: Address;
    }
): Promise<{
    proposeId: string;
}> {
    const { governanceInstance, taxTokenInstance, lendingTokenAddress } = configs;
    const {
        preVoteLength,
        totalVoteLength,
        expirationLength,
        minVote,
        minVoteCore,
        minCommit,
    } = coreParameter;

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
    const res = await governanceInstance.proposeUpdateCoreParameters(
        preVoteLength,
        totalVoteLength,
        expirationLength,
        fromE0(minVote, 4),
        fromE0(minVoteCore, 4),
        fromE0(minCommit, 4),
        { from: account }
    );

    const targetLogs = res.logs.filter(isLogProposeUpdateCoreParametersType);
    if (targetLogs.length === 0) {
        throw new Error('the log of LogProposeUpdateCoreParameters event was not emitted');
    }

    const { proposeId } = targetLogs[0].args;
    return { proposeId };
}

export const voteForUpdateCoreParameters = vote;

export const lockInForUpdateCoreParameters = lockInProposal;

export async function applyCoreParameterProposal(
    account: Address,
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    await governanceInstance.applyGovernanceForUpdateCore(proposeId, { from: account });
}

export const withdrawForUpdateCoreParameters = withdraw;

export const getUserStatusUpdateCoreParameters = getUserStatus;

export const getStatusUpdateCoreParameters = getStatus;

export async function getInfoUpdateCoreParameters(
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    const {
        '0': preVoteLength,
        '1': totalVoteLength,
        '2': expirationLength,
        '3': minVoteE4,
        '4': minVoteCoreE4,
        '5': minCommitE4,
    } = await governanceInstance.getInfoUpdateCoreParameters(proposeId);
    return {
        preVoteLength: preVoteLength.toNumber(),
        totalVoteLength: totalVoteLength.toNumber(),
        expirationLength: expirationLength.toNumber(),
        minVote: toE0(minVoteE4, 4),
        minVoteCore: toE0(minVoteCoreE4, 4),
        minCommit: toE0(minCommitE4, 4),
    };
}
