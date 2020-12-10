import { ZERO_ADDRESS } from '../util';
import { MAX_TERM } from './testCases';

export interface RandomCounter {
    stake: number[];
    withdraw: number[];
    receive: number[];
    change: number[];
    deposit: number;
}

export const newRandomCounter = () => {
    return {
        stake: [0, 0, 0, 0],
        withdraw: [0, 0, 0, 0],
        receive: [0, 0, 0, 0],
        change: [0, 0, 0, 0],
        deposit: 0,
    } as RandomCounter;
};

export const getAmount = (
    counter: RandomCounter,
    accounts: string[],
    who: string,
    what: StakingWhat
) => {
    const index = accounts.indexOf(who);
    switch (what) {
        case 'STAKE':
            return 2 ** counter.stake[index];
        case 'WITHDRAW':
            return 2 ** counter.withdraw[index];
        case 'RECEIVE':
            return 2 ** counter.receive[index];
        case 'CHANGE':
            return 2 ** counter.change[index];
        case 'DEPOSIT':
            return 2 ** counter.deposit;
    }
};

export const addAmount = (
    counter: RandomCounter,
    accounts: string[],
    who: string,
    what: StakingWhat
) => {
    const index = accounts.indexOf(who);
    switch (what) {
        case 'STAKE':
            counter.stake[index]++;
            break;
        case 'WITHDRAW':
            counter.withdraw[index]++;
            break;
        case 'RECEIVE':
            counter.receive[index]++;
            break;
        case 'CHANGE':
            counter.change[index]++;
            break;
        case 'DEPOSIT':
            counter.deposit++;
    }
};

export const randomGet = (array: any[]) => {
    return array[Math.floor(Math.random() * array.length)];
};

export const OTHER_ADDRESS = 'ERC20';

export const randomToken = [ZERO_ADDRESS, OTHER_ADDRESS];

export const getRandomToken = () => {
    return randomGet(randomToken);
};

// accounts[randomWho]
export const randomWho = [0, 1, 2, 3];

export const getRandomWho = (accounts: string[]) => {
    return accounts[randomGet(randomWho)];
};

export const randomWhen = [0, 1, 2, MAX_TERM + 2];

export const getRandomWhen = () => {
    return randomGet(randomWhen);
};

export type StakingWhat = 'STAKE' | 'WITHDRAW' | 'RECEIVE' | 'CHANGE' | 'DEPOSIT';

export const randomWhat = [
    'STAKE',
    'STAKE',
    'STAKE',
    'WITHDRAW',
    'RECEIVE',
    'RECEIVE',
    'CHANGE',
    'DEPOSIT',
    'DEPOSIT',
    'DEPOSIT',
    'DEPOSIT',
];

export const getRandomWhat = () => {
    return randomGet(randomWhat);
};
