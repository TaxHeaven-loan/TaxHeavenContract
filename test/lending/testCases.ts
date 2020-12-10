import BigNumber from 'bignumber.js';

const tooMuchBorrowErrMes = 'too much borrow';
const tooMuchRepayErrMes = 'too much repay';

export const simpleWithdrawScenario = [
    (() => {
        const interestE0 = 0.005;
        const depositAmountE0 = 10000;
        const remainingCreditE0 = new BigNumber(depositAmountE0).times(1 - interestE0);
        return {
            title: '',
            errorMessage: '',
            depositAmountE0,
            withdrawingAmountE0: remainingCreditE0,
        };
    })(),
];

export const simpleBorrowScenario = [
    (() => {
        const interestE0 = 0.005;
        const depositAmountE0 = 10000;
        const remainingCreditE0 = new BigNumber(depositAmountE0).times(1 - interestE0);
        return {
            title: '',
            errorMessage: '',
            depositAmountE0,
            borrowingAmountE0: remainingCreditE0,
        };
    })(),
    (() => {
        const interestE0 = 0.005;
        const depositAmountE0 = 15000;
        const remainingCreditE0 = new BigNumber(depositAmountE0).times(1 - interestE0);
        return {
            title: 'reverts if a borrower borrow more than remaining credit of the lender',
            errorMessage: tooMuchBorrowErrMes,
            depositAmountE0,
            borrowingAmountE0: remainingCreditE0.plus(1),
        };
    })(),
];

export const simpleRepayScenario = [
    (() => {
        const interestE0 = 0.005;
        const depositAmountE0 = 10000;
        const remainingCreditE0 = new BigNumber(depositAmountE0).times(1 - interestE0);
        return {
            title: '',
            errorMessage: '',
            depositAmountE0,
            borrowingAmountE0: remainingCreditE0,
            repayingAmountE0: remainingCreditE0,
        };
    })(),
];

export default { simpleWithdrawScenario, simpleBorrowScenario, simpleRepayScenario };
