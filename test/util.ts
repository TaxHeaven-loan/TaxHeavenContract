import BigNumber from 'bignumber.js';
import BN from 'bn.js';
import Web3 from 'web3';

declare const web3: Web3;

export const DECIMALS_OF_STRIKE_PRICE = 4;
export const DECIMALS_OF_BOND_AMOUNT = 8;
export const DECIMALS_OF_IDOL_AMOUNT = 8;
export const DECIMALS_OF_BOND_VALUE = DECIMALS_OF_BOND_AMOUNT + DECIMALS_OF_STRIKE_PRICE;
export const DECIMALS_OF_ETH2USD_RATE = 8;
export const DECIMALS_OF_VOLATILITY = 8;
export const DECIMALS_OF_TAX_TOKEN = 18;

export const DAYS = 86400;
export const INTERVAL = 1 * 60 * 60 * 24 * 7; // 1 week.

export type Address = string;

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

export const expectRevert = (errorMessage: string, expected?: string) => {
    const expectedErrorMessage = [
        expected,
        `Returned error: VM Exception while processing transaction: revert ${expected}`,
        `Returned error: VM Exception while processing transaction: revert ${expected} -- Reason given: ${expected}.`,
    ];
    return expected !== undefined && expectedErrorMessage.includes(errorMessage);
};

function hasSendFunction(
    arg: any
): arg is Exclude<Web3['currentProvider'], string | number | null> {
    return typeof arg.send === 'function';
}

export async function advanceTime(seconds: number) {
    return await new Promise((resolve, reject) => {
        const currentProvider = web3.currentProvider;
        if (!hasSendFunction(currentProvider)) {
            throw new Error('provider was not found');
        }

        const { send } = currentProvider;
        if (send === undefined) {
            throw new Error('provider was not found');
        }

        send(
            {
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [seconds],
                id: new Date().getTime().toString(),
            },
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

export async function advanceTerm(term: number) {
    return await advanceTime(INTERVAL * term);
}

export async function mineOneBlock() {
    return await new Promise((resolve, reject) => {
        const currentProvider = web3.currentProvider;
        if (!hasSendFunction(currentProvider)) {
            throw new Error('provider was not found');
        }

        const { send } = currentProvider;
        if (send === undefined) {
            throw new Error('provider was not found');
        }

        send(
            {
                jsonrpc: '2.0',
                method: 'evm_mine',
                params: [],
                id: new Date().getTime().toString(),
            },
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

export async function getBlockTimestampSec() {
    const block = await web3.eth.getBlock('latest');
    const timestamp = Number(block.timestamp);
    if (Number.isNaN(timestamp)) {
        throw new Error('block timestamp was not a number');
    }

    return timestamp;
}

/**
 * @example
 *   fromE0Amount(10, 6); // 10000000
 *   fromE0Amount(3.5, 6); // 3500000
 *   fromE0Amount(1.23456, 4); // 12345
 *   fromE0Amount(1.23456, 4, BigNumber.ROUND_UP); // 12346
 */
export const fromE0 = (
    amount: BigNumber.Value,
    decimals: number,
    roundingMode?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
): string => new BigNumber(amount.toString()).shiftedBy(decimals).dp(0, roundingMode).toString(10);

/**
 * @example
 *   toE0Amount(10000000, 6); // new BigNumber(10)
 *   toE0Amount(3500000, 6); // new BigNumber(3.5)
 *   toE0Amount(12345.6, 4); // new BigNumber(1.23456)
 *   toE0Amount(120); // new BigNumber(120)
 */
export const toE0 = (amount: BigNumber.Value | BN, decimals: number = 0): BigNumber =>
    new BigNumber(amount.toString()).shiftedBy(-decimals);
