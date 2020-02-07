/**
 * User: ggarrido
 * Date: 14/08/19 15:44
 * Copyright 2019 (c) Lightstreams, Granada
 */
const Web3Wrapper = require('../web3');
const CID = require('cids');
const {
  fundRecipient,
  isRelayHubDeployed,
  getRecipientFunds
} = require('../gsn');

const {
  buyArtistTokens,
  transfer: transferArtistToken,
  getBalanceOf
} = require('./artist_token');

const factoryScJSON = require('../../build/contracts/GSNProfileFactory.json');
const profileScJSON = require('../../build/contracts/GSNProfile.json');

const cidPrefix = 'Qm';
const cidLength = 46;

function convertHexToCid(hexValue) {
  // [18,32] Correspond to the removed cidPrefix 'Qm'
  const arrayBuffer = [...[18, 32], ...Web3Wrapper.utils.hexToBytes(hexValue)];
  const cidObj = new CID(Web3Wrapper.utils.toBuffer(arrayBuffer));
  return cidObj.toString();
}

function convertCidToBytes32(cid) {
  if (cid.length !== cidLength || cid.indexOf(cidPrefix) !== 0) {
    throw new Error('Invalid cid value');
  }
  const cidObj = new CID(cid);
  return cidObj.multihash.slice(2).toJSON().data;
}

module.exports.convertHexToCid = convertHexToCid;
module.exports.convertCidToBytes32 = convertCidToBytes32;

module.exports.initializeProfileFactory = async (web3, { contractAddr, relayHub, from, factoryFundingInPht, faucetFundingInPht }) => {
  Web3Wrapper.validator.validateAddress("from", from);
  Web3Wrapper.validator.validateAddress("relayHub", relayHub);
  Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);

  if (isNaN(parseFloat(factoryFundingInPht))) {
    throw new Error(`Invalid "factoryFundingInPht" value ${factoryFundingInPht}. Expected a float number`);
  }

  if (isNaN(parseFloat(faucetFundingInPht))) {
    throw new Error(`Invalid "profileFundingInPht" value ${faucetFundingInPht}. Expected a float number`);
  }

  const isRelayHub = await isRelayHubDeployed(web3, { relayHub });
  if(!isRelayHub) {
    throw new Error(`RelayHub is not found at ${relayHub}`);
  }

  // Step 2: Initialize gsn feature within profile factory contract
  const txReceipt = await Web3Wrapper.contractSendTx(web3, {
    to: contractAddr,
    from,
    abi: factoryScJSON.abi,
    method: 'initialize',
    params: [relayHub]
  });
  if (!txReceipt.status) {
    throw new Error(`ProfileFactory initialization failed`);
  } else {
    console.log(`Activated GSN for ProfileFactory instance for RelayHub ${relayHub}...`);
  }

  // Step 3: Profile factory is funded via RelayHub
  await fundRecipient(web3, {
    from,
    recipient: contractAddr,
    relayHub: relayHub,
    amountInPht: factoryFundingInPht
  });

  console.log(`Recipient ${contractAddr} is sponsored by relayHub with ${factoryFundingInPht} PHTs...`);

  // Step 4: Top up factory contract to fund new profile deployments
  await Web3Wrapper.sendTransaction(web3, { from, to: contractAddr, valueInPht: faucetFundingInPht });
  console.log(`Topped up ProfileFactory with ${faucetFundingInPht} PHTs to fund new profile creations...`);

  return contractAddr;
};

module.exports.validateHasEnoughFundToDeployProfile = async(web3, { contractAddr }) => {
  const recipientFundsInWei = await getRecipientFunds(web3, { recipient: contractAddr });
  const recipientFundsInPht = Web3Wrapper.utils.toPht(`${recipientFundsInWei}`);
  console.log(`GSNProfileFactory recipient has ${recipientFundsInPht} PHT for GSN`);
  if (parseFloat(recipientFundsInPht) < 1.0) {
    throw new Error(`Not enough recipient funds: ${recipientFundsInPht} PHT`);
  }

  const balanceInWei = await Web3Wrapper.getBalance(web3, { address: contractAddr });
  const balanceInPht = Web3Wrapper.utils.toPht(balanceInWei);
  console.log(`GSNProfileFactory contract has ${balanceInPht} PHT in balance`);
  const newProfileFundingInWei = await Web3Wrapper.contractCall(web3, {
    to: contractAddr,
    abi: factoryScJSON.abi,
    method: 'profileFunding'
  });

  const newProfileFundingInPht = Web3Wrapper.utils.toPht(newProfileFundingInWei);
  if(parseFloat(balanceInPht) < parseFloat(newProfileFundingInPht)) {
    throw new Error(`Not enough funds in factory contract. Requires ${newProfileFundingInPht} PHT, has ${balanceInPht} PHT`);
  }
};

module.exports.deployProfileByFactory = async (web3, { from, contractAddr, useGSN }) => {
  const txReceipt = await Web3Wrapper.contractSendTx(web3, {
    to: contractAddr,
    from,
    useGSN: useGSN || false,
    abi: factoryScJSON.abi,
    method: 'newProfile',
    params: [from]
  });

  return txReceipt.events['NewProfile'].returnValues['addr'];
};

module.exports.addOwner = async (web3, { from, contractAddr, useGSN, ownerAddr }) => {
  return Web3Wrapper.contractSendTx(web3, {
    to: contractAddr,
    from,
    useGSN: useGSN || false,
    abi: profileScJSON.abi,
    method: 'addOwner',
    params: [ownerAddr]
  });
};

module.exports.recover = async (web3, contractAddr, { from, newOwner, useGSN }) => {
  if (!newOwner && !from) {
    throw new Error(`Missing mandatory call params`);
  }

  return Web3Wrapper.contractSendTx(web3, {
    to: contractAddr,
    from: from,
    useGSN: useGSN || false,
    method: 'recover',
    abi: profileScJSON.abi,
    params: [newOwner],
  })
};

module.exports.getOwners = (web3, { contractAddr }) => {
  return Web3Wrapper.contractCall(web3, {
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'getOwners',
  }).then(owners => {
    return owners.map(addr => addr.toLowerCase())
  });
};

module.exports.getFiles = (web3, { contractAddr }) => {
  return Web3Wrapper.contractCall(web3, {
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'getFiles',
  }).then((files) => {
    return files.map(convertHexToCid);
  });
};

module.exports.getFileAcl = (web3, { contractAddr, cid }) => {
  return Web3Wrapper.contractCall(web3, {
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'getFileAcl',
    params: [convertCidToBytes32(cid)]
  });
};

module.exports.addFile = (web3, { from, contractAddr, cid, acl }) => {
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

module.exports.removeFile = (web3, { from, contractAddr, cid }) => {
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

const transferTokens = module.exports.transferTokens = (web3, {from, beneficiary, contractAddr, amountInPht}) => {
  Web3Wrapper.validator.validateAddress("from", from);
  Web3Wrapper.validator.validateAddress("beneficiary", beneficiary);
  Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);

  return Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'transferTokens',
    params: [beneficiary, Web3Wrapper.utils.toWei(amountInPht)]
  });
};

module.exports.transferArtistTokens = (web3, {from, beneficiary, contractAddr, artistToken, amount}) => {
  Web3Wrapper.validator.validateAddress("from", from);
  Web3Wrapper.validator.validateAddress("beneficiary", beneficiary);
  Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);
  Web3Wrapper.validator.validateAddress("artistToken", artistToken);

  return Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'transferArtistTokens',
    params: [artistToken, beneficiary, amount]
  });
};

module.exports.hatchArtistToken = async (web3, {from, contractAddr, artistTokenAddr, wphtAddr, amountInPht}) => {

  Web3Wrapper.validator.validateAddress("from", from);
  Web3Wrapper.validator.validateAddress("wphtAddr", wphtAddr);
  Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);
  Web3Wrapper.validator.validateAddress("artistTokenAddr", artistTokenAddr);

  const receipt = await Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'hatchArtistToken',
    params: [artistTokenAddr, wphtAddr, Web3Wrapper.utils.toWei(amountInPht), true]
  });

  if (!receipt.events['HatchedArtistTokens']) {
    return null;
  }

  const tokens = receipt.events['HatchedArtistTokens'].returnValues['amount'];
  console.log(`Hatcher ${from} obtained an estimated amount of ${Web3Wrapper.utils.toPht(tokens).toString()} ArtistTokens ${artistTokenAddr}`);
  return Web3Wrapper.utils.toBN(tokens);
};

module.exports.claimArtistToken = async (web3, {from, contractAddr, artistTokenAddr}) => {

  Web3Wrapper.validator.validateAddress("from", from);
  Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);
  Web3Wrapper.validator.validateAddress("artistTokenAddr", artistTokenAddr);

  const receipt = await Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'claimArtistToken',
    params: [artistTokenAddr]
  });

  if (!receipt.events['ClaimedArtistTokens']) {
    return null;
  }

  const tokens = receipt.events['ClaimedArtistTokens'].returnValues['amount'];
  console.log(`Hatcher ${from} claimed an amount of ${Web3Wrapper.utils.toPht(tokens).toString()} ArtistTokens ${artistTokenAddr}`);
  return Web3Wrapper.utils.toBN(tokens);
};

module.exports.refundArtistToken = async (web3, {from, contractAddr, artistTokenAddr, wphtAddr}) => {

  Web3Wrapper.validator.validateAddress("from", from);
  Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);
  Web3Wrapper.validator.validateAddress("artistTokenAddr", artistTokenAddr);
  Web3Wrapper.validator.validateAddress("wphtAddr", wphtAddr);

  const receipt = await Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'refundArtistToken',
    params: [artistTokenAddr, wphtAddr]
  });

  if (!receipt.events['RefundedTokens']) {
    return null;
  }

  const tokens = receipt.events['RefundedTokens'].returnValues['amount'];
  console.log(`Hatcher ${from} get a refund of ${Web3Wrapper.utils.toPht(tokens).toString()} WPHT tokens`);
  return Web3Wrapper.utils.toBN(tokens);
};

module.exports.buyArtistToken = async(web3, {from, contractAddr, artistTokenAddr, wphtAddr, amountInPht}) => {

  Web3Wrapper.validator.validateAddress("from", from);
  Web3Wrapper.validator.validateAddress("wphtAddr", wphtAddr);
  Web3Wrapper.validator.validateAddress("contractAddr", contractAddr);
  Web3Wrapper.validator.validateAddress("artistTokenAddr", artistTokenAddr);

  const receipt = await Web3Wrapper.contractSendTx(web3, {
    from: from,
    to: contractAddr,
    abi: profileScJSON.abi,
    method: 'buyArtistToken',
    params: [artistTokenAddr, wphtAddr, Web3Wrapper.utils.toWei(amountInPht), true]
  });

  if(!receipt.events['BoughtArtistTokens']) {
    return null;
  }

  const tokens = receipt.events['BoughtArtistTokens'].returnValues['amount'];
  console.log(`Buyer ${from} purchased ${Web3Wrapper.utils.toPht(tokens).toString()} of ArtistTokens ${artistTokenAddr}`);
  return Web3Wrapper.utils.toBN(tokens);
};