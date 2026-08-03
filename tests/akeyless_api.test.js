jest.mock('@actions/core');

const http = require('http');
const akeyless = require('akeyless');
const core = require('@actions/core');
const { api, DEFAULT_USER_AGENT } = require('../src/akeyless_api');

describe('akeyless_api', () => {
  beforeEach(() => {
    core.getInput = jest.fn(() => '');
  });

  it('sets User-Agent on ApiClient defaultHeaders for superagent@10 compatibility', () => {
    const clientApi = api('https://api.akeyless.io');
    // V2Api keeps a reference to the ApiClient
    expect(clientApi.apiClient.defaultHeaders['User-Agent']).toBe(DEFAULT_USER_AGENT);
    expect(clientApi.apiClient.defaultHeaders['akeylessclienttype']).toBe('github_action');
  });

  it('sends User-Agent on outbound auth requests', async () => {
    const seen = await new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const headers = { ...req.headers };
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        server.close(() => resolve(headers));
      });
      server.on('error', reject);
      server.listen(0, async () => {
        const port = server.address().port;
        const clientApi = api(`http://127.0.0.1:${port}`);
        try {
          await clientApi.auth(akeyless.Auth.constructFromObject({
            'access-type': 'access_key',
            'access-id': 'p-test',
            'access-key': 'test-key',
          }));
        } catch (_) {
          // expected 401 from mock server
        }
      });
    });

    expect(seen['user-agent']).toBe(DEFAULT_USER_AGENT);
    expect(seen['akeylessclienttype']).toBe('github_action');
  });
});
