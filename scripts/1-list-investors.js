var CrowdsaleMinter = artifacts.require("./CrowdsaleMinter.sol");
let Promise = require("bluebird");
let BigNumber = require('bignumber.js');
let assert = require('assert');

module.exports = function(done) {
        let minter, investorsCount, investors;
        //return CrowdsaleMinter.deployed()
        return CrowdsaleMinter.at("0xDa2Cf810c5718135247628689D84F94c61B41d6A")
        .then(_minter => {
            minter = _minter;
            return minter.investorsCount()
        }).then(bn_investorsCount => {
            investorsCount = bn_investorsCount.toNumber();
            console.log('investorsCount> '+investorsCount);
            let p_investors = [];
            for(let i=0;i<investorsCount;++i){
                p_investors.push(minter.investors(i))
            }
            return Promise.all(p_investors);
        }).then(investors => {
            return Promise.all( investors.map(e=>{
              return minter.balances(e);}) );
        }).then(balances => {
            console.log(balances.reduce( (a,b)=> new BigNumber(a).plus(b)) );
            done();
        });
};
