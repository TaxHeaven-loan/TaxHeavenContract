# Tax Heaven Protocol

## Protocol

Lend your ETH or favorite ERC20 token and borrow the same token.

Any ERC20 token is accepted!

All loans are interest free and the collateral factor always stays constant.

Take out 99.5% of the value you put up as collateral.

Only 0.5% fee to use the Tax Heaven protocol!

## TAX token & distribution

“TAX” is Tax Heaven’s native token.

The 0.5% fee that is charged when using the Tax Heaven protocol is distributed to people staking the TAX token.

The TAX token is distributed to depositors of “whitelisted tokens”.

The amount of TAX tokens that the depositors receive is based on the value of the token (determined using Chainlink price feeds) that is being deposited to the protocol.

Up to $200M worth of assets deposited to the lending contract, you will receive 1 TAX token for 1 dollar.

Above the $200M line, the amount of TAX token you receive for 1 dollar is halved every time the cumulative deposit value doubles.

The issuance of TAX tokens ends when the cumulative deposit value exceeds $51.2B.

85% of issued TAX tokens are distributed to the depositors, 10% are distributed to the incentive fund addresses(5% for Uniswap-share token staking contract and 5% for the reserve for future marketing, audits fee, etc in the initial setting), and 5% are distributed to the developer address.

## Audits

The Contract is NOT AUDITED.  DYOR!!!!!

Contributors have given their best efforts to ensure the security of these contracts, but make no guarantees. It has been spot checked by just a few pairs of eyes. It is a probability - not just a possibility - that there are bugs.

The tax token is issued when a whitelisted token is lent in the lending contract, but it might be possible that the tax token is issued for a non-whitelisted token and end up with unexpected inflation. Such a case would occur when a malicious proposal is accepted through the governance process.

The lending contract, which you directly expose your asset to, may be less risky to use as users can instantly borrow assets when you deposit assets. However, it won't guarantee the safety of your assets during the few blocks of time. Non-standard ERC20 such as AMPL may work inappropriately.

The tax token staking contract, which you deposit your tax token to, is subject to the risk you lose your tax token, or you lose the chance to receive dividends.

The governance contract, which you can use by staking the tax token in the staking contract, may cause your tax token to be unredeemable from the staking contract. Even if there is no bug in the code, the economical vulnerability may exist and a malicious token may be whitelisted or some core parameters might be unintendedly updated.

The uniswap-share token staking contract is same implementation as the tax token staking contract. You have the risk that you may not be able to redeem the uniswap-share token and may lose your tax token and ETH.


If you feel uncomfortable with these disclosures, don't stake or hold TAX, or simply don't use Tax Heaven Protocol at all.


## Contract addresses

### Ethereum

Tax Token Contract:
[0xB6A439237b6705DF8f6cD8e285A41c1e9a8a6A95](https://etherscan.io/address/0xB6A439237b6705DF8f6cD8e285A41c1e9a8a6A95)

Lending Contract:
[0x9043d140FC5b1b6EEf5A11357d80211C422FAb83](https://etherscan.io/address/0x9043d140FC5b1b6EEf5A11357d80211C422FAb83)

Staking Contract:
[0xA383C8390aDbCd387DB93BabdF3F30308391Bd57](https://etherscan.io/address/0xA383C8390aDbCd387DB93BabdF3F30308391Bd57)

Governance Contract:
[0xe904e50514C5EF0f4C15C9BA44D358eD38f5a024](https://etherscan.io/address/0xe904e50514C5EF0f4C15C9BA44D358eD38f5a024)

Uniswap-share Staking Contract:
[0x337aa0334EeF264a62ea6AF101fCdf2AEC6761Cf](https://etherscan.io/address/0x337aa0334EeF264a62ea6AF101fCdf2AEC6761Cf)


### Binance Smart Chain

Tax Token Contract:
[0xEcAeC5352Cfb49565C1Fd82377614707F71a8a65](https://bscscan.com/address/0xEcAeC5352Cfb49565C1Fd82377614707F71a8a65)

Lending Contract:
[0x2961E261Ea2e0c62BcfBAabf0F89304A245250a4](https://bscscan.com/address/0x2961E261Ea2e0c62BcfBAabf0F89304A245250a4)

Staking Contract:
[0x04d7242667C3883E35E1b6d0A2b793CF5fA4C509](https://bscscan.com/address/0x04d7242667C3883E35E1b6d0A2b793CF5fA4C509)

Governance Contract:
[0xe44D557A1f8B53fe06C9c937A3A2d4f36774769e](https://bscscan.com/address/0xe44D557A1f8B53fe06C9c937A3A2d4f36774769e)

PancakeSwap-share Staking Contract:
[0x7be3CD7c01cb450ABcFC5aeA74a2B50849BcD79d](https://bscscan.com/address/0x7be3CD7c01cb450ABcFC5aeA74a2B50849BcD79d)


## Build and generate types

```
yarn compile
```

or

```
yarn generate
```

## Test

```
yarn test
```

## Prietter

```
yarn fix
```

## Try random tests
### Rewrite skip tests
L110~112 at `test/staking/3_random_staking.test.ts` changes from:
```
// Default skip random cases.
// it(`case ${caseIndex}`, async () => {
it.skip(`case ${caseIndex}`, async () => {
```
to
```
// Default skip random cases.
it(`case ${caseIndex}`, async () => {
// it.skip(`case ${caseIndex}`, async () => {
```


### random test
```
yarn test ./test/staking/3_random_staking.test.ts
```

### output
The result of random test cases, output to the below files.
```
log/{caseIndex}_{token}_{account_id}_{what}_{term}_{success_or_failed}.json
```
