"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

/**
 * User: ggarrido
 * Date: 4/02/19 11:22
 * Copyright 2019 (c) Lightstreams, Palma
 */
var request = require('../http/request');

var ERC20_BALANCE_PATH = "/erc20/balance";
var ERC20_TRANSFER_PATH = "/erc20/transfer";
var ERC20_PURCHASE_PATH = "/erc20/purchase";

module.exports = function (gwDomain) {
  return {
    /**
     * Get balance of any erc20 token
     * @param erc20_address Address of the erc20 token contract
     * @param account Account address for which to check the balance
     * @returns {Promise<{ balance }>}
     */
    balance: function balance(erc20_address, account) {
      return request.get("".concat(gwDomain).concat(ERC20_BALANCE_PATH), {
        erc20_address: erc20_address,
        account: account
      });
    },

    /**
     * Transfer erc20 token to an account
     * @param erc20_address ERC20 token address
     * @param from Account address to transfer funds from
     * @param password The password that unlocks the account
     * @param to Account address to transfer funds to
     * @param amount Amount in erc20 token
     * @returns {Promise<*>}
     */
    transfer: function transfer(erc20_address, from, password, to, amount) {
      return request.post("".concat(gwDomain).concat(ERC20_TRANSFER_PATH), {
        erc20_address: erc20_address,
        from: from,
        password: password,
        to: to,
        amount: amount.toString()
      });
    },

    /**
     * Sending tokens to ICO contract and purchase tokens
     * @param erc20_address ERC20 token address
     * @param account Account address to transfer funds from
     * @param password The password that unlocks the account
     * @param amount_wei Amount in wei to purchase
     * @returns {Promise<{ tokens }>}
     */
    purchase: function () {
      var _purchase = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee(erc20_address, account, password, amount_wei) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return request.post("".concat(gwDomain).concat(ERC20_PURCHASE_PATH), {
                  erc20_address: erc20_address,
                  password: password,
                  account: account,
                  amount_wei: amount_wei.toString()
                });

              case 2:
                return _context.abrupt("return", _context.sent);

              case 3:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function purchase(_x, _x2, _x3, _x4) {
        return _purchase.apply(this, arguments);
      }

      return purchase;
    }()
  };
};