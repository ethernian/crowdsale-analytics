module.exports = {
    networks: {
        live: {
            host: "localhost",
            port: 8545,
            network_id: 1,
            gas: 2000000,
            gasPrice: "20000000000"
            //,from: "0x00eCf92fA3678678a1B82899da1307a0083b6379"
        },
        development: {
          host: "localhost",
          gas: 4700000,
          port: 8555,
          network_id: "*" // Match any network id
        }
    }
};
