"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

/**
 * User: ggarrido
 * Date: 14/08/19 15:44
 * Copyright 2019 (c) Lightstreams, Granada
 */
var Web3Wrapper = require('../web3');

var CID = require('cids');

var _require = require('../gsn'),
    fundRecipient = _require.fundRecipient,
    isRelayHubDeployed = _require.isRelayHubDeployed,
    getRecipientFunds = _require.getRecipientFunds;

var factoryScJSON = require('../../build/contracts/GSNProfileFactory.json');

var profileScJSON = require('../../build/contracts/GSNProfile.json');

var cidPrefix = 'Qm';
var cidLength = 46;

function convertHexToCid(hexValue) {
  // [18,32] Correspond to the removed cidPrefix 'Qm'
  var arrayBuffer = [18, 32].concat(_toConsumableArray(Web3Wrapper.utils.hexToBytes(hexValue)));
  var cidObj = new CID(Web3Wrapper.utils.toBuffer(arrayBuffer));
  return cidObj.toString();
}

function convertCidToBytes32(cid) {
  if (cid.length !== cidLength || cid.indexOf(cidPrefix) !== 0) {
    throw new Error('Invalid cid value');
  }

  var cidObj = new CID(cid);
  return cidObj.multihash.slice(2).toJSON().data;
}

module.exports.convertHexToCid = convertHexToCid;
module.exports.convertCidToBytes32 = convertCidToBytes32;

module.exports.initializeProfileFactory = function _callee(web3, _ref) {
  var contractAddr, relayHub, from, factoryFundingInPht, faucetFundingInPht, isRelayHub, txReceipt;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          contractAddr = _ref.contractAddr, relayHub = _ref.relayHub, from = _ref.from, factoryFundingInPht = _ref.factoryFundingInPht, faucetFundingInPht = _ref.faucetFundingInPht;
          Web3Wrapper.validator.validateAddress("from", from);
          Web3Wrapper.validator.validateAddress("relayHub", relayHub);
          Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);

          if (!isNaN(parseFloat(factoryFundingInPht))) {
            _context.next = 6;
            break;
          }

          throw new Error("Invalid \"factoryFundingInPht\" value ".concat(factoryFundingInPht, ". Expected a float number"));

        case 6:
          if (!isNaN(parseFloat(faucetFundingInPht))) {
            _context.next = 8;
            break;
          }

          throw new Error("Invalid \"profileFundingInPht\" value ".concat(faucetFundingInPht, ". Expected a float number"));

        case 8:
          _context.next = 10;
          return regeneratorRuntime.awrap(isRelayHubDeployed(web3, {
            relayHub: relayHub
          }));

        case 10:
          isRelayHub = _context.sent;

          if (isRelayHub) {
            _context.next = 13;
            break;
          }

          throw new Error("RelayHub is not found at ".concat(relayHub));

        case 13:
          _context.next = 15;
          return regeneratorRuntime.awrap(Web3Wrapper.contractSendTx(web3, {
            to: contractAddr,
            from: from,
            abi: factoryScJSON.abi,
            method: 'initialize',
            params: [relayHub]
          }));

        case 15:
          txReceipt = _context.sent;

          if (txReceipt.status) {
            _context.next = 20;
            break;
          }

          throw new Error("ProfileFactory initialization failed");

        case 20:
          console.log("Activated GSN for ProfileFactory instance for RelayHub ".concat(relayHub, "..."));

        case 21:
          _context.next = 23;
          return regeneratorRuntime.awrap(fundRecipient(web3, {
            from: from,
            recipient: contractAddr,
            relayHub: relayHub,
            amountInPht: factoryFundingInPht
          }));

        case 23:
          console.log("Recipient ".concat(contractAddr, " is sponsored by relayHub with ").concat(factoryFundingInPht, " PHTs...")); // Step 4: Top up factory contract to fund new profile deployments

          _context.next = 26;
          return regeneratorRuntime.awrap(Web3Wrapper.sendTransaction(web3, {
            from: from,
            to: contractAddr,
            valueInPht: faucetFundingInPht
          }));

        case 26:
          console.log("Topped up ProfileFactory with ".concat(faucetFundingInPht, " PHTs to fund new profile creations..."));
          return _context.abrupt("return", contractAddr);

        case 28:
        case "end":
          return _context.stop();
      }
    }
  });
};

module.exports.validateHasEnoughFundToDeployProfile = function _callee2(web3, _ref2) {
  var contractAddr, recipientFundsInWei, recipientFundsInPht, balanceInWei, balanceInPht, newProfileFundingInWei, newProfileFundingInPht;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          contractAddr = _ref2.contractAddr;
          _context2.next = 3;
          return regeneratorRuntime.awrap(getRecipientFunds(web3, {
            recipient: contractAddr
          }));

        case 3:
          recipientFundsInWei = _context2.sent;
          recipientFundsInPht = Web3Wrapper.utils.toPht("".concat(recipientFundsInWei));
          console.log("GSNProfileFactory recipient has ".concat(recipientFundsInPht, " PHT for GSN"));

          if (!(parseFloat(recipientFundsInPht) < 1.0)) {
            _context2.next = 8;
            break;
          }

          throw new Error("Not enough recipient funds: ".concat(recipientFundsInPht, " PHT"));

        case 8:
          _context2.next = 10;
          return regeneratorRuntime.awrap(Web3Wrapper.getBalance(web3, {
            address: contractAddr
          }));

        case 10:
          balanceInWei = _context2.sent;
          balanceInPht = Web3Wrapper.utils.toPht(balanceInWei);
          console.log("GSNProfileFactory contract has ".concat(balanceInPht, " PHT in balance"));
          _context2.next = 15;
          return regeneratorRuntime.awrap(Web3Wrapper.contractCall(web3, {
            to: contractAddr,
            abi: factoryScJSON.abi,
            method: 'profileFunding'
          }));

        case 15:
          newProfileFundingInWei = _context2.sent;
          newProfileFundingInPht = Web3Wrapper.utils.toPht(newProfileFundingInWei);

          if (!(balanceInPht < newProfileFundingInPht)) {
            _context2.next = 19;
            break;
          }

          throw new Error("Not enough funds in factory contract. Requires ".concat(newProfileFundingInPht, " PHT, has ").concat(balanceInPht, " PHT"));

        case 19:
        case "end":
          return _context2.stop();
      }
    }
  });
};

module.exports.deployProfileByFactory = function _callee3(web3, _ref3) {
  var from, contractAddr, useGSN, txReceipt;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          from = _ref3.from, contractAddr = _ref3.contractAddr, useGSN = _ref3.useGSN;
          _context3.next = 3;
          return regeneratorRuntime.awrap(Web3Wrapper.contractSendTx(web3, {
            to: contractAddr,
            from: from,
            useGSN: useGSN || false,
            abi: factoryScJSON.abi,
            method: 'newProfile',
            params: [from]
          }));

        case 3:
          txReceipt = _context3.sent;
          return _context3.abrupt("return", txReceipt.events['NewProfile'].returnValues['addr']);

        case 5:
        case "end":
          return _context3.stop();
      }
    }
  });
};

module.exports.addOwner = function _callee4(web3, _ref4) {
  var from, contractAddr, useGSN, ownerAddr;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          from = _ref4.from, contractAddr = _ref4.contractAddr, useGSN = _ref4.useGSN, ownerAddr = _ref4.ownerAddr;
          return _context4.abrupt("return", Web3Wrapper.contractSendTx(web3, {
            to: contractAddr,
            from: from,
            useGSN: useGSN || false,
            abi: profileScJSON.abi,
            method: 'addOwner',
            params: [ownerAddr]
          }));

        case 2:
        case "end":
          return _context4.stop();
      }
    }
  });
};

module.exports.recover = function _callee5(web3, contractAddr, _ref5) {
  var from, newOwner, useGSN;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          from = _ref5.from, newOwner = _ref5.newOwner, useGSN = _ref5.useGSN;

          if (!(!newOwner && !from)) {
            _context5.next = 3;
            break;
          }

          throw new Error("Missing mandatory call params");

        case 3:
          return _context5.abrupt("return", Web3Wrapper.contractSendTx(web3, {
            to: contractAddr,
            from: from,
            useGSN: useGSN || false,
            method: 'recover',
            abi: profileScJSON.abi,
            params: [newOwner]
          }));

        case 4:
        case "end":
          return _context5.stop();
      }
    }
  });
};

module.exports.getOwners = function (web3, _ref6) {
  var contractAddr = _ref6.contractAddr;
  return Web3Wrapper.contractCall(web3, {
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'getOwners'
  }).then(function (owners) {
    return owners.map(function (addr) {
      return addr.toLowerCase();
    });
  });
};

module.exports.getFiles = function (web3, _ref7) {
  var contractAddr = _ref7.contractAddr;
  return Web3Wrapper.contractCall(web3, {
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'getFiles'
  }).then(function (files) {
    return files.map(convertHexToCid);
  });
};

module.exports.getFileAcl = function (web3, _ref8) {
  var contractAddr = _ref8.contractAddr,
      cid = _ref8.cid;
  return Web3Wrapper.contractCall(web3, {
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'getFileAcl',
    params: [convertCidToBytes32(cid)]
  });
};

module.exports.addFile = function (web3, _ref9) {
  var from = _ref9.from,
      contractAddr = _ref9.contractAddr,
      cid = _ref9.cid,
      acl = _ref9.acl;

  if (cid.length !== cidLength || cid.indexOf(cidPrefix) !== 0) {
    throw new Error('Invalid cid value');
  }

  return Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'addFile',
    params: [convertCidToBytes32(cid), acl]
  });
};

module.exports.removeFile = function (web3, _ref10) {
  var from = _ref10.from,
      contractAddr = _ref10.contractAddr,
      cid = _ref10.cid;

  if (cid.length !== cidLength || cid.indexOf(cidPrefix) !== 0) {
    throw new Error('Invalid cid value');
  }

  return Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'removeFile',
    params: [convertCidToBytes32(cid)]
  });
};