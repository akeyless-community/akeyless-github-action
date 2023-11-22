const akeylessCloud = require("akeyless-cloud-id");
const mockFs = require('mock-fs');
jest.mock('@actions/core');
jest.mock('../src/akeyless_api');
jest.mock('akeyless-cloud-id');

core = require('@actions/core');
akeylessApi = require('../src/akeyless_api');
akeyless = require('akeyless');
akeylessCloudId = require('akeyless-cloud-id');
auth = require('../src/auth');

describe('Akeyless authentication', () => {
  const akeylessToken = 'akeyless-token'
  const accessId = 'p-12345'
  const apiUrl = 'https://api.akeyless.io'

  let api = jest.fn(() => {});
  api.auth = jest.fn(() => Promise.resolve({token: akeylessToken}));
  akeylessApi.api = jest.fn(() => api);

  it('testing access_key login', async () => {
    const accessType = 'access_key'
    const accessKeyValue = 'access_key_value'

    core.getInput = jest.fn(() => accessKeyValue);

    authOutput = await auth.akeylessLogin(accessId, accessType, apiUrl)

    checkParams(authOutput, {
      'access-type': accessType,
      'access-id': accessId,
      'access-key': accessKeyValue
    })
  })

  it('testing jwt login', async () => {
    accessType = 'jwt'
    githubJwt = 'github-jwt'

    core.getIDToken = jest.fn(() => Promise.resolve(githubJwt));

    authOutput = await auth.akeylessLogin(accessId, accessType, apiUrl)
    checkParams(authOutput, {
      'access-type': accessType,
      'access-id': accessId,
      'jwt': githubJwt
    })
  })

  it('testing aws_iam login', async () => {
    const accessType = 'aws_iam'
    const awsCloudId = "aws_cloud_id"

    akeylessCloud.getCloudId = jest.fn(() => awsCloudId);

    authOutput = await auth.akeylessLogin(accessId, accessType, apiUrl)

    checkParams(authOutput, {
      'access-type': accessType,
      'access-id': accessId,
      'cloud-id': awsCloudId
    })
  })

  it('testing azure login', async () => {
    const accessType = 'azure_ad'
    const azureCloudId = "azure_cloud_id"

    akeylessCloud.getCloudId = jest.fn(() => azureCloudId);
    api.auth = jest.fn(() => Promise.resolve({token: akeylessToken}));

    authOutput = await auth.akeylessLogin(accessId, accessType, apiUrl)
    checkParams(authOutput, {
      'access-type': accessType,
      'access-id': accessId,
      'cloud-id': azureCloudId
    })
  })

  it('testing gcp login', async () => {
    const accessType = 'gcp'
    const gcpCloudId = "gcp_cloud_id"
    const gcpAudience = "gcp_audience"

    core.getInput = jest.fn(() => gcpAudience);
    akeylessCloud.getCloudId = jest.fn(() => gcpCloudId);

    authOutput = await auth.akeylessLogin(accessId, accessType, apiUrl)
    checkParams(authOutput, {
      'access-type': accessType,
      'access-id': accessId,
      'cloud-id': gcpCloudId,
      'gcp-audience': gcpAudience
    })
  })

  it('testing kubernetes login', async () => {
    // Mock filesystem for k8s JWT
    mockFs({
      '/var/run/secrets/kubernetes.io/serviceaccount': {
        'token': 'k8s-token-content'
      }
    });

    const accessType = 'k8s';
    const gatewayUrl = "gateway_url";
    const k8sAuthConfigName = "k8s_auth_config_name";
    const expectedBase64Token = Buffer.from('k8s-token-content').toString('base64');

    core.getInput = jest.fn((inputName) => {
      if (inputName === 'gateway-url') {
        return gatewayUrl;
      }
      if (inputName === 'k8s-auth-config-name') {
        return k8sAuthConfigName;
      }
      return null;
    });

    authOutput = await auth.akeylessLogin(accessId, accessType, apiUrl);

    await checkParams(authOutput, {
      'access-id': accessId,
      'access-type': accessType,
      'k8s-auth-config-name': k8sAuthConfigName,
      'gateway-url': gatewayUrl,
      'k8s-service-account-token': expectedBase64Token
    });

    // Restore the filesystem after the test
    mockFs.restore();
  });

  async function checkParams(token, params) {
    expect(token).toEqual({token: akeylessToken});
    expect(api.auth).toHaveBeenCalledWith(params);
  }
})

