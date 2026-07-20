/**
 * Cloud identity helpers for Akeyless cloud auth (AWS IAM / Azure AD / GCP).
 * AWS uses AWS SDK for JavaScript v3 credential providers + Smithy SigV4
 * (no aws-sdk v2 / aws4 url.parse).
 *
 * Provider SDKs are required lazily so jwt/access_key auth does not load them.
 */

async function getCloudId(accType, param) {
  if (accType === 'aws_iam') {
    return getAwsCloudId();
  }
  if (accType === 'azure_ad') {
    return getAzureCloudId(param);
  }
  if (accType === 'gcp') {
    return getGcpCloudId(param);
  }
  if (accType === 'access_key') {
    return '';
  }
  throw new Error('Invalid access type');
}

async function getAzureCloudId() {
  const { DefaultAzureCredential } = require('@azure/identity');
  const credential = new DefaultAzureCredential();
  const scope = 'https://management.azure.com/.default';
  const token = await credential.getToken(scope);
  return Buffer.from(token.token).toString('base64');
}

async function getGcpCloudId(audience) {
  if (!audience) {
    audience = 'akeyless.io';
  }

  const { GoogleAuth } = require('google-auth-library');
  const googleAuth = new GoogleAuth();
  const client = await googleAuth.getClient();
  let token;

  if (typeof client.fetchIdToken === 'function') {
    token = await client.fetchIdToken(audience);
  } else if (client.serviceAccountImpersonationUrl) {
    // WIF: get ID token via IAM Credentials API.
    // URL format: https://iamcredentials.googleapis.com/v1/{name=projects/*/serviceAccounts/*}:generateAccessToken
    const { IAMCredentialsClient } = require('@google-cloud/iam-credentials');
    const url = client.serviceAccountImpersonationUrl;
    const name = url.match(/projects\/[^:]+/)?.[0];
    if (!name) {
      throw new Error('Invalid serviceAccountImpersonationUrl format');
    }
    const [resp] = await new IAMCredentialsClient().generateIdToken({
      name,
      audience,
      includeEmail: true,
    });
    token = resp.token;
  } else {
    const idTokenClient = await googleAuth.getIdTokenClient(audience);
    const headers = await idTokenClient.getRequestHeaders();
    token = headers.Authorization.replace('Bearer ', '');
  }
  return Buffer.from(token).toString('base64');
}

async function getAwsCloudId() {
  const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');
  const credentials = await fromNodeProviderChain()();
  return stsGetCallerIdentity({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  });
}

async function stsGetCallerIdentity(creds) {
  const { SignatureV4 } = require('@smithy/signature-v4');
  const { HttpRequest } = require('@smithy/protocol-http');
  const { Sha256 } = require('@aws-crypto/sha256-js');

  const body = 'Action=GetCallerIdentity&Version=2011-06-15';
  const host = 'sts.amazonaws.com';
  const region = 'us-east-1';

  const signer = new SignatureV4({
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
    region,
    service: 'sts',
    sha256: Sha256,
  });

  const request = new HttpRequest({
    method: 'POST',
    protocol: 'https:',
    hostname: host,
    path: '/',
    headers: {
      host,
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
      'content-length': String(Buffer.byteLength(body)),
    },
    body,
  });

  const signed = await signer.sign(request);

  const h = {
    Authorization: [signed.headers.authorization || signed.headers.Authorization],
    'Content-Length': [String(Buffer.byteLength(body))],
    Host: [host],
    'Content-Type': ['application/x-www-form-urlencoded; charset=utf-8'],
    'X-Amz-Date': [signed.headers['x-amz-date'] || signed.headers['X-Amz-Date']],
  };
  const securityToken = signed.headers['x-amz-security-token'] || signed.headers['X-Amz-Security-Token'] || creds.sessionToken;
  if (securityToken) {
    h['X-Amz-Security-Token'] = [securityToken];
  }

  const obj = {
    sts_request_method: 'POST',
    sts_request_url: Buffer.from('https://sts.amazonaws.com/').toString('base64'),
    sts_request_body: Buffer.from(body).toString('base64'),
    sts_request_headers: Buffer.from(JSON.stringify(h)).toString('base64'),
  };
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

module.exports = {
  getAwsCloudId,
  getAzureCloudId,
  getGcpCloudId,
  getCloudId,
};
