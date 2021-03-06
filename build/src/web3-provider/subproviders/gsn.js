"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * User: ggarrido
 * Date: 30/08/19 18:05
 * Copyright 2019 (c) Lightstreams, Granada
 */
var inherits = require('util').inherits;

var Subprovider = require('web3-provider-engine/subproviders/subprovider');

var _require = require('@openzeppelin/gsn-provider/src/utils'),
    callAsJsonRpc = _require.callAsJsonRpc,
    fixTransactionReceiptResponse = _require.fixTransactionReceiptResponse;

var RelayClient = require('@openzeppelin/gsn-provider/src/tabookey-gasless/RelayClient');

var Web3 = require('../../web3');

function GsnSubprovider(provider, opts) {
  var web3 = Web3.newEngine(provider);
  this.relayClient = new RelayClient(web3, _objectSpread({}, opts));
  this.jsonRpcSend = opts.jsonRpcSend ? opts.jsonRpcSend : mustProvideInConstructor('jsonRpcSend');
  this.options = opts;
  this.relayedTxs = new Set();
}

inherits(GsnSubprovider, Subprovider);

GsnSubprovider.prototype._handleGetTransactionReceipt = function (payload, cb) {
  var _this = this;

  // Check for GSN usage
  var txHash = payload.params[0];
  if (!this.relayedTxs.has(txHash)) return false; // Set error status if tx was rejected

  this.jsonRpcSend('eth_getTransactionReceipt', [txHash]).then(function (receipt) {
    cb(null, fixTransactionReceiptResponse(receipt, _this.options.verbose));
  })["catch"](function (err) {
    cb(err, null);
  });
  return true;
};

GsnSubprovider.prototype._handleSendTransaction = function (payload, cb) {
  var _this2 = this;

  // Check for GSN usage
  if (!this._withGSN(payload, this.options)) return false;
  var txParams = payload.params[0]; // Use sign key address if set

  if (!txParams.from && this.base.address) txParams.from = this.base.address;

  if (!txParams.to) {
    return cb(new Error("Cannot deploy a new contract via the GSN"), null);
  }

  if (txParams.value) {
    var strValue = txParams.value.toString();

    if (strValue !== '0' && strValue !== '0x0') {
      return cb(new Error("Cannot send funds via the GSN"), null);
    }
  } // Delegate to relay client


  callAsJsonRpc(this.relayClient.sendTransaction.bind(this.relayClient), [payload], payload.id, function (err, res) {
    cb(err, res && res.result);
  }, function (txHash) {
    _this2.relayedTxs.add(txHash);

    return {
      result: txHash
    }; // return txHash;
  });
  return true;
};

GsnSubprovider.prototype._handleEstimateGas = function (payload, cb) {
  if (!this._withGSN(payload, this.options)) return false;
  var txParams = payload.params[0];
  callAsJsonRpc(this.relayClient.estimateGas.bind(this.relayClient), [txParams], payload.id, cb);
  return true;
};

GsnSubprovider.prototype._withGSN = function (payload, options) {
  if (_typeof(payload.params[0]) === 'object') {
    if (typeof payload.params[0].useGSN === 'boolean') return payload.params[0].useGSN;else if (typeof payload.params[0].useGSN === 'function') return payload.params[0].useGSN(payload);
  }

  if (_typeof(options) === 'object') {
    if (typeof options.useGSN === 'function') return options.useGSN(payload);
    if (typeof options.useGSN === 'boolean') return options.useGSN;
  }

  return true;
};

GsnSubprovider.prototype.handleRequest = function (payload, next, end) {
  switch (payload.method) {
    case 'eth_sendTransaction':
      {
        if (this._handleSendTransaction(payload, end)) return;
        break;
      }

    case 'eth_estimateGas':
      {
        if (this._handleEstimateGas(payload, end)) return;
        break;
      }

    case 'eth_getTransactionReceipt':
      {
        if (this._handleGetTransactionReceipt(payload, end)) return;
        break;
      }

    default:
      {
        next();
        return;
      }
  }

  next();
};

function mustProvideInConstructor(methodName) {
  return function (params, cb) {
    cb(new Error('ProviderEngine - GSNSubprovider - Must provide "' + methodName + '" fn in constructor options'));
  };
}

module.exports = GsnSubprovider;