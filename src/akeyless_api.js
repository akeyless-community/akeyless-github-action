const akeyless = require('akeyless');
const https = require('https');
const core = require("@actions/core");

function api(url) {
    const client = new akeyless.ApiClient();
    const caCertificate = core.getInput('ca-certificate')
    if (caCertificate && caCertificate != "") {
        const agent = new https.Agent({
            ca: caCertificate
        })
        client.requestAgent = agent
    }
    client.basePath = url;
    return new akeyless.V2Api(client);
}

exports.api = api;
