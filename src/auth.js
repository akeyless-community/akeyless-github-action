const core = require('@actions/core');
const akeyless = require('akeyless');
const akeylessApi = require('./akeyless_api');
const fs = require('fs');
const path = require('path');
const akeylessCloud = require('akeyless-cloud-id')

function handleActionFail(message, debugMessage) {
    core.debug(debugMessage);  // Only visible with ACTIONS_RUNNER_DEBUG=true
    core.setFailed(message);   // Always visible
    throw new Error(message);
}


async function accessKeyLogin(apiUrl, accessId) {
    const accessKey = core.getInput('access-key');
    const opts = {
        'access-type': 'access_key',
        'access-id': accessId,
        'access-key': accessKey
    }
    return loginHelper(opts, apiUrl)
}

async function jwtLogin(apiUrl, accessId) {
    core.debug('Fetching JWT from Github');
    const githubToken = await core.getIDToken();
    opts = {
        'access-type': 'jwt',
        'access-id': accessId,
        jwt: githubToken
    }
    return loginHelper(opts, apiUrl)
}

async function awsIamLogin(apiUrl, accessId) {
    core.debug('getting aws cloud id');
    const awsCloudId = await akeylessCloud.getCloudId('aws_iam')
    const opts = {
        "access-type": 'aws_iam',
        'access-id': accessId,
        'cloud-id': awsCloudId
    }
    return loginHelper(opts, apiUrl)
}

async function azureLogin(apiUrl, accessId) {
    core.debug('getting azure cloud id');
    const azureCloudId = await akeylessCloud.getCloudId('azure_ad')

    const opts = {'access-id': accessId, 'access-type': 'azure_ad', 'cloud-id': azureCloudId}
    return loginHelper(opts, apiUrl)
}

async function gcpLogin(apiUrl, accessId) {
    core.debug('getting gcp cloud id');
    const gcpCloudId = await akeylessCloud.getCloudId('gcp')
    const gcpAudience = core.getInput('gcp-audience');
    opts = {'access-id': accessId, 'access-type': 'gcp', 'cloud-id': gcpCloudId, 'gcp-audience': gcpAudience}
    return loginHelper(opts, apiUrl)
}

async function kubernetesLogin(apiUrl, accessId) {
    const gatewayUrl = core.getInput('gateway-url')
    const authConfigName = core.getInput('k8s-auth-config-name')
    const serviceAccountToken = await readK8SServiceAccountJWT()
    opts = {'access-id': accessId, 'access-type': "k8s", 'k8s-auth-config-name': authConfigName, 'gateway-url': gatewayUrl, 'k8s-service-account-token': serviceAccountToken}
    return loginHelper(opts, apiUrl)
}

async function readK8SServiceAccountJWT() {
    const DefServiceAccountFile  = "/var/run/secrets/kubernetes.io/serviceaccount/token"

    try {
        const data = await fs.promises.readFile(path.resolve(DefServiceAccountFile), 'utf8');
        const trimmedData = data.trim();
        const base64Token = Buffer.from(trimmedData).toString('base64');
        return base64Token;
    } catch (err) {
        throw new Error(`Error reading the service account JWT: ${err.message}`);
    }
}

async function uidLogin(apiUrl, accessId) {
    const universalIdentityToken = core.getInput('uid_token')
    opts = {'access-id': accessId, 'access-type': 'universal_identity', 'uid_token': universalIdentityToken }
    return loginHelper(opts, apiUrl)
}

async function loginHelper(opts, apiUrl) {
    core.debug('Fetching token from AKeyless');
    try{
        let api = akeylessApi.api(apiUrl)
        let authBody = akeyless.Auth.constructFromObject(opts)
        const authResult = await api.auth(authBody)
        return authResult
    } catch (error) {
        handleActionFail('Failed to login to Akeyless', `Failed to login to AKeyless: ${typeof error === 'object' ? JSON.stringify(error) : error}`)
    }
}

const login = {
    jwt: jwtLogin,
    aws_iam: awsIamLogin,
    azure_ad: azureLogin,
    gcp: gcpLogin,
    k8s: kubernetesLogin,
    universal_identity: uidLogin,
    access_key: accessKeyLogin
};

const allowedAccessTypes = Object.keys(login);

async function akeylessLogin(accessId, accessType, apiUrl) {
    try {
        core.debug('fetch token');
        return login[accessType](apiUrl, accessId);
    } catch (error) {
        handleActionFail('failed to fetch token', error.message);
    }
}

exports.akeylessLogin = akeylessLogin;
exports.allowedAccessTypes = allowedAccessTypes;
