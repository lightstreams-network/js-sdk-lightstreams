"use strict";

/**
 * User: ggarrido
 * Date: 27/08/19 16:54
 * Copyright 2019 (c) Lightstreams, Granada
 */
var Web3 = require('../web3');

var PublicResolver = require('@ensdomains/resolver/build/contracts/PublicResolver.json');

var namehash = require('eth-ens-namehash');

module.exports = function (web3) {
  return {
    deploy: function deploy(_ref) {
      var from = _ref.from,
          ensAddress = _ref.ensAddress;
      return Web3.deployContract(web3, {
        from: from,
        abi: PublicResolver.abi,
        bytecode: PublicResolver.bytecode,
        params: [ensAddress]
      }).then(function (txHash) {
        return Web3.getTxReceipt(web3, {
          txHash: txHash
        });
      });
    },
    setAddr: function setAddr(contractAddress, _ref2) {
      var from = _ref2.from,
          node = _ref2.node,
          address = _ref2.address,
          owner = _ref2.owner;
      return Web3.contractSendTx(web3, contractAddress, {
        from: from || owner,
        abi: PublicResolver.abi,
        method: 'setAddr',
        params: [node.indexOf('0x') === 0 ? node : namehash.hash(node), //node
        address]
      }).then(function (txHash) {
        return Web3.getTxReceipt(web3, {
          txHash: txHash
        });
      });
    }
  };
};