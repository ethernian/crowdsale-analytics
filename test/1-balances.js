const  CrowdsaleMinter = artifacts.require("./CrowdsaleMinter.sol");
const  SAN = artifacts.require("./SAN.sol");
const  BalanceStorage = artifacts.require("BalanceStorage");
const  PresaleBonusVoting= artifacts.require("PresaleBonusVoting");
const  presalers = require("../lib/presale-addresses.js");
const  Promise = require("bluebird");
const  BigNumber = require('bignumber.js');
const  _ = require('lodash');

const ADVISERS_AND_FRIENDS_WALLET = "0x44f145f6bc36e51eed9b661e99c8b9ccf987c043";
const TEAM_GROUP_WALLET = "0xa0d8f33ef9b44daae522531dd5e7252962b09207";
const TOKEN_PER_ETH = 1000;
const TOLERANCE = 0.0000000001;
const toEther = wei => web3.fromWei(wei, 'ether').toNumber();
const eth_diff = (a,b) => toEther(a.minus(b).absoluteValue())

contract(' test live minter_balances', function (){

        let minter, crowdsalersCount, investors, crowdsalers, minter_balances, token_balances, token_totalSupply;
        let presaleMap = new Map();
        let votingMap = new Map();
        let teamBalance,partnerBalance;

        before('setup', function(){
            return promiseMinterData()
            .then(mint_sum => promiseTokenData())
            .then(()=>promisePresaleData())
            .then(()=>promisePresaleVotingData())
        });

        it('all crowdsalers are set', function() {
            crowdsalers.forEach((e,i) =>
                assert.ok(e,"zero investor address encounted: #"+i)
            );
        });

        it('sum of minter_balances is 45000', function() {
             let sum = minter_balances.reduce((a,b) => new BigNumber(a).plus(b)) ;
             assert.equal(toEther(sum, 'ether'), 45000,"sum mismatch: "+sum);
        });

        xit('sum of token_balances is 45000*1000', function() {
             let sum = token_balances.reduce((a,b) => new BigNumber(a).plus(b)) ;
             assert.equal(toEther(sum, 'ether'), 45000000,"sum mismatch: "+sum);
        });

        it('non-presale bonuses are ok ', function() {
             let exp_sum = new BigNumber(0);
             //let sum = token_balances.reduce((a,b) => new BigNumber(a).plus(b)) ;
             investors.forEach((addr,i) => {
                let eth_balance = minter_balances[i];
                let exp_token = eth_balance ? eth_balance.mul(TOKEN_PER_ETH) : new BigNumber(0);
                if (presaleMap.has(addr)) {
                    exp_token = exp_token.plus(presaleMap.get(addr).mul(TOKEN_PER_ETH)); //basys token
                    exp_token = exp_token.plus(presaleMap.get(addr).mul(TOKEN_PER_ETH* 0.54).mul(votingMap.get(addr))); //bonus token
                }
                assert.isBelow(eth_diff(exp_token,token_balances[i]),TOLERANCE,'mismatch token balance> #i'+i+', addr: '+addr);
                exp_sum = exp_sum.plus(exp_token);
             })
             exp_sum=exp_sum.plus(teamBalance).plus(partnerBalance);
             assert.isBelow(eth_diff(exp_sum,totalSupply),TOLERANCE,'mismatch totalSupply> ');
        });

        function promiseTokenData(){
            return SAN.at("0x7c5a0ce9267ed19b22f8cae653f198e3e8daf098")
            .then(_token => {
                token=_token;
                return Promise.all(investors.map((e,i) => token.balanceOf(e)))
                .then(_token_balances => {
                    token_balances = _token_balances;
                    return Promise.all([
                        token.totalSupply(),
                        token.balanceOf(TEAM_GROUP_WALLET),
                        token.balanceOf(ADVISERS_AND_FRIENDS_WALLET)
                    ])
                }).spread((_totalSupply, _teamBalance, _partnerBalance) => {
                    totalSupply = _totalSupply;
                    teamBalance = _teamBalance;
                    partnerBalance = _partnerBalance;
                });
            });
        }

        function promiseMinterData(){
            return CrowdsaleMinter.at("0xDa2Cf810c5718135247628689D84F94c61B41d6A")
            .then(_minter => (minter=_minter).investorsCount())
            .then(_crowdsalersCount => {
                crowdsalersCount = _crowdsalersCount.toNumber();
                let p_crowdsalers = [];
                for(let i=0;i<crowdsalersCount;++i){
                    p_crowdsalers.push(minter.investors(i))
                }
                return Promise.all(p_crowdsalers);
            }).then(_crowdsalers => {
                crowdsalers=_crowdsalers.map(e=>e.toLowerCase());
                investors = _.union(crowdsalers,presalers)
                return Promise.all(crowdsalers.map(e=>minter.balances(e)))
                    .then(_minter_balances => (minter_balances=_minter_balances).reduce((a,b)=> new BigNumber(a).plus(b)))
            });
        }

        function promisePresaleVotingData(addr) {
            return PresaleBonusVoting.at("0x283a97Af867165169AECe0b2E963b9f0FC7E5b8c")
            .then(instance => Promise.all(presalers.map(addr=>instance.rawVotes(addr))))
            .then(_rawVotes =>
                 _rawVotes.forEach((bn_raw_vote,i) => {
                    let vote;
                    let raw_vote = toEther(bn_raw_vote);
                    if (raw_vote == 0) vote = 1;
                    else if (raw_vote <= 0.01) vote = 0;
                    else vote = raw_vote;
                    votingMap.set(presalers[i], vote);
                }))
        }

        function promisePresaleData(addr) {
            return BalanceStorage.at("0x4Fd997Ed7c10DbD04e95d3730cd77D79513076F2")
            .then(instance => Promise.all(presalers.map(addr=>instance.balances(addr))))
            .then(_presale_balances =>
                 _presale_balances.forEach((balance,i) => presaleMap.set(presalers[i], balance)))
        }

});
