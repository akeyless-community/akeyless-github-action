jest.mock('@actions/core');
jest.mock('../src/akeyless_api');

const core = require('@actions/core');
const akeylessApi = require('../src/akeyless_api');
const secrets = require('../src/secrets');
const auth = require('../src/auth');
const { formatError } = require('../src/errors');

const MARKER = 'MARKER';

// Shape the akeyless SDK rejects with: the original request (with token/value) is inside.
const sdkError = (status) => ({
  status,
  body: { error: 'server error' },
  response: { req: { data: { token: MARKER, value: MARKER, 'access-key': MARKER } } },
});

function loggedText() {
  return ['debug', 'info', 'warning', 'error', 'setFailed']
    .flatMap(fn => core[fn].mock.calls.flat())
    .join('\n');
}

beforeEach(() => jest.resetAllMocks());

describe('formatError', () => {
  it.each([
    ['SDK HTTP error', sdkError(409), '409 server error'],
    ['plain Error', new Error('boom'), 'boom'],
    ['network error', { error: new Error('connect ECONNREFUSED') }, 'connect ECONNREFUSED'],
    ['unknown object', { response: {} }, 'request failed'],
    ['string', 'boom', 'boom'],
  ])('%s', (_, error, expected) => {
    expect(formatError(error)).toBe(expected);
  });
});

describe('errors are logged without request data', () => {
  it.each([
    ['staticSecrets', 'getSecretValue'],
    ['dynamicSecrets', 'getDynamicSecretValue'],
    ['rotatedSecrets', 'getRotatedSecretValue'],
    ['sshCertificate', 'getSSHCertificate'],
    ['pkiCertificate', 'getPKICertificate'],
  ])('export %s', async (key, apiFn) => {
    akeylessApi.api.mockReturnValue({ [apiFn]: jest.fn().mockRejectedValue(sdkError(500)) });
    await secrets.handleExportSecrets({ akeylessToken: MARKER, apiUrl: 'u', [key]: [{ name: 'n', 'output-name': 'o' }] });
    expect(core.setFailed).toHaveBeenCalled();
    expect(loggedText()).not.toContain(MARKER);
  });

  it.each([
    ['handleCreateSecrets', 'secretsToCreate', 'createSecret', "Failed to create secret 'n': 409 server error"],
    ['handleUpdateSecrets', 'secretsToUpdate', 'updateSecretVal', "Failed to update secret 'n': 409 server error"],
  ])('%s', async (handler, arg, apiFn, expected) => {
    akeylessApi.api.mockReturnValue({ [apiFn]: jest.fn().mockRejectedValue(sdkError(409)) });
    await secrets[handler]({ akeylessToken: MARKER, apiUrl: 'u', [arg]: [{ name: 'n', value: MARKER }, { value: MARKER }] });
    expect(core.warning).toHaveBeenCalledWith(expected);
    expect(loggedText()).not.toContain(MARKER);
  });

  it('non-JSON secret with a key', async () => {
    akeylessApi.api.mockReturnValue({ getDynamicSecretValue: jest.fn().mockResolvedValue(MARKER) });
    await secrets.handleExportSecrets({ akeylessToken: 't', apiUrl: 'u', dynamicSecrets: [{ name: 'n', 'output-name': 'o', key: 'k' }] });
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('secret is not valid JSON'));
    expect(loggedText()).not.toContain(MARKER);
  });

  it('login failure', async () => {
    core.getInput.mockReturnValue(MARKER);
    akeylessApi.api.mockReturnValue({ auth: jest.fn().mockRejectedValue(sdkError(401)) });
    await expect(auth.akeylessLogin('p-id', 'access_key', 'u')).rejects.toThrow('Failed to login to Akeyless: 401 server error');
    expect(loggedText()).not.toContain(MARKER);
  });
});
