import React, {Component} from 'react';

import { Web3, Gateway as useGateway, Leth } from 'lightstreams-js-sdk'

class SimpleReactFileUpload extends Component {
  constructor(props) {
    super(props);

    this.state = {
      file: null,
      owner: '',
      account: '0xc916cfe5c83dd4fc3c3b0bf2ec2d4e401782875e',
      grantReadMsg: '',
      gatewayUrl: process.env.GATEWAY_DOMAIN || 'http://localhost:9091',
      web3Provider: process.env.WEB3_PROVIDER || 'http://localhost:8545'
    };

    this.gateway = useGateway(this.state.gatewayUrl);

    this.onStorageFormSubmit = this.onStorageFormSubmit.bind(this);
    this.onStorageFormFileChange = this.onStorageFormFileChange.bind(this);

    this.onACLFormSubmit = this.onACLFormSubmit.bind(this);
    this.onStatusFormSubmit = this.onStatusFormSubmit.bind(this);

    this.onACLGrantRead = this.onACLGrantRead.bind(this);
    this.onACLGrantWrite = this.onACLGrantWrite.bind(this);
    this.onACLGrantAdmin = this.onACLGrantAdmin.bind(this);
    this.onACLRevokeAccess = this.onACLRevokeAccess.bind(this);
    this.onACLGrantPublicAccess = this.onACLGrantPublicAccess.bind(this);
    this.onACLRevokePublicAccess = this.onACLRevokePublicAccess.bind(this);

    this.onHasRead = this.onHasRead.bind(this);
    this.onHasAdmin = this.onHasAdmin.bind(this);
    this.onGetOwner = this.onGetOwner.bind(this);
    this.onGetStatus = this.onGetStatus.bind(this);
  }

  componentDidMount() {
    const web3 = Web3.newEngine(this.state.web3Provider, {useRemoteKeystore: true});
    const pwd = "notsosecret";

    window.web3 = web3;

    this.gateway.user.signUp(pwd).then((res) => {
      setTimeout(() => {
        web3.eth.personal.getAccounts().then((accounts) => {
          const acc = res.account.toLowerCase()

          console.log(accounts);
          console.log(res.account);

          this.gateway.wallet.transfer("0xc916cfe5c83dd4fc3c3b0bf2ec2d4e401782875e", "WelcomeToSirius", acc, "5000000000000000000").then(() => {
            web3.eth.personal.unlockAccount(acc, pwd).then(() => {
              this.setState({ web3, owner: acc });
            });
          });
        });
      }, 2000);
    });
  }

  onStorageFormSubmit(e) {
    e.preventDefault();

    const { web3, owner, file } = this.state;

    Leth.Storage.add(web3, this.gateway.storage, {from: owner, owner, file, isPublic: false})
      .then((res) => {
        this.setState({ meta: res.meta, acl: res.acl });
      })
      .catch(console.log)
  }

  onACLFormSubmit(e) {
    e.preventDefault();
  }

  onStatusFormSubmit(e) {
    e.preventDefault();
  }

  onACLGrantRead() {
    const { web3, owner, account, acl } = this.state;

    Leth.ACL.grantRead(web3, {from: owner, contractAddr: acl, account})
      .then((res) => {
        this.setState({ grantReadMsg: "Read access successfully granted" });
      })
      .catch(console.log)
  }

  onACLGrantWrite() {
    const { web3, owner, account, acl } = this.state;

    Leth.ACL.grantWrite(web3, {from: owner, contractAddr: acl, account})
      .then((res) => {
        this.setState({ grantReadMsg: "Write access successfully granted" });
      })
      .catch(console.log)
  }

  onACLGrantAdmin() {
    const { web3, owner, account, acl } = this.state;

    Leth.ACL.grantAdmin(web3, {from: owner, contractAddr: acl, account})
      .then((res) => {
        this.setState({ grantReadMsg: "Admin access successfully granted" });
      })
      .catch(console.log)
  }

  onACLRevokeAccess() {
    const { web3, owner, account, acl } = this.state;

    Leth.ACL.revokeAccess(web3, {from: owner, contractAddr: acl, account})
      .then((res) => {
        this.setState({ grantReadMsg: "Access successfully revoked" });
      })
      .catch(console.log)
  }

  onACLGrantPublicAccess() {
    const { web3, owner, acl } = this.state;

    Leth.ACL.grantPublicAccess(web3, {from: owner, contractAddr: acl})
      .then((res) => {
        this.setState({ grantReadMsg: "Public access successfully granted" });
      })
      .catch(console.log)
  }

  onACLRevokePublicAccess() {
    const { web3, owner, acl } = this.state;

    Leth.ACL.revokePublicAccess(web3, {from: owner, contractAddr: acl})
      .then((res) => {
        this.setState({ grantReadMsg: "Public access successfully revoked" });
      })
      .catch(console.log)
  }

  onHasRead() {
    const { web3, acl, account } = this.state;

    Leth.ACL.hasRead(web3, {contractAddr: acl, account})
      .then((res) => {
        this.setState({ grantReadMsg: res.toString() });
      })
      .catch(console.log)
  }

  onHasAdmin() {
    const { web3, acl, account } = this.state;

    Leth.ACL.hasAdmin(web3, {contractAddr: acl, account})
      .then((res) => {
        this.setState({ grantReadMsg: res.toString() });
      })
      .catch(console.log)
  }

  onGetOwner() {
    const { web3, acl } = this.state;

    Leth.ACL.getOwner(web3, {contractAddr: acl})
      .then((res) => {
        this.setState({ grantReadMsg: res });
      })
      .catch(console.log)
  }

  onGetStatus() {
    const { peerId } = this.state;

    Leth.Storage.status(web3, this.gateway.storage)
      .then((res) => {
        console.log(res);

        this.setState({ peerId: res.peer_id });
      })
      .catch(console.log)
  }

  onStorageFormFileChange(e) {
    this.setState({ file: e.target.files[0] })
  }

  render() {
    const {owner, account, gatewayUrl, meta, peerId, acl, grantReadMsg } = this.state;

    return (
      <div>
        <form onSubmit={this.onStorageFormSubmit}>
          <label>Auto generated account (remember to fund it) </label>
          <input type="text" value={owner} />
          <br />
          <label>Leth Gateway where content is stored in IPFS </label>
          <input type="text" disabled value={gatewayUrl} disabled onChange={(e) => this.setState({ gatewayUrl: e.target.value })} />
          <br />
          <label>File </label>
          <input type="file" onChange={this.onStorageFormFileChange} />
          <br/>
          <button type="submit">Upload with local keys </button>
        </form>

        <h3>Result:</h3>
        <p>Meta: {meta}</p>
        <p>ACL: {acl}</p>
        <p>
          <form onSubmit={this.onACLFormSubmit}>
            <label>Account</label>
            <input type="text" value={account} onChange={(e) => this.setState({ account: e.target.value })} />
            <br />
            <button type="submit" onClick={this.onACLGrantRead}>Grant read</button>
            <button type="submit" onClick={this.onACLGrantWrite}>Grant write</button>
            <button type="submit" onClick={this.onACLGrantAdmin}>Grant admin</button>
            <button type="submit" onClick={this.onACLRevokeAccess}>Revoke access</button>
            <button type="submit" onClick={this.onACLGrantPublicAccess}>Grant public access</button>
            <button type="submit" onClick={this.onACLRevokePublicAccess}>Revoke public access</button>
            <button type="submit" onClick={this.onHasRead}>Has account Read Access?</button>
            <button type="submit" onClick={this.onHasAdmin}>Has account Admin Access?</button>
            <button type="submit" onClick={this.onGetOwner}>Who is the owner?</button>
          </form>
          <p>
            <strong>{grantReadMsg}</strong>
          </p>

        <h3>Status:</h3>
        <p>PeerId: {peerId}</p>
        <p>
          <form onSubmit={this.onStatusFormSubmit}>
            <button type="submit" onClick={this.onGetStatus}>What's the node's status?</button>
          </form>
          </p>
        </p>
      </div>
    )
  }
}

export default () => (
  <div>
    <h2>Storage</h2>
    <SimpleReactFileUpload />
  </div>
);
