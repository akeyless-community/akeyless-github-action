const akeyless = require('akeyless');
const https = require('https');
const core = require("@actions/core");

// superagent@10 (forced via package.json overrides for DEP0169) no longer sets a
// default User-Agent. superagent@3 always sent "node-superagent/3.7.0". Some
// Gateways / ingress / WAF policies reject requests with no User-Agent, which
// surfaced as "Failed to login to Akeyless" after v1.1.7.
const DEFAULT_USER_AGENT = 'node-superagent/3.7.0 akeyless-github-action';

function api(url) {
    const client = new akeyless.ApiClient();

    const caCertificate = core.getInput('ca-certificate')
    if (caCertificate && caCertificate != "") {
        const agent = new https.Agent({
            ca: caCertificate
        })
        client.requestAgent = agent
    }

    client.defaultHeaders = {
        'akeylessclienttype': 'github_action',
        'User-Agent': DEFAULT_USER_AGENT,
    }
    client.basePath = url;
    return new akeyless.V2Api(client);
}

exports.api = api;
exports.DEFAULT_USER_AGENT = DEFAULT_USER_AGENT;
