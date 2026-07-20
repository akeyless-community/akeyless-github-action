jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: () => async () => ({
    accessKeyId: 'AKIATEST',
    secretAccessKey: 'secret',
    sessionToken: 'session',
  }),
}));

const { getCloudId, getAwsCloudId } = require('../src/cloud_id');

describe('cloud_id', () => {
  it('rejects invalid access types', async () => {
    await expect(getCloudId('invalid')).rejects.toThrow('Invalid access type');
  });

  it('returns empty cloud id for access_key', async () => {
    await expect(getCloudId('access_key')).resolves.toBe('');
  });

  it('builds a base64 aws_iam cloud id with signed STS headers', async () => {
    const cloudId = await getAwsCloudId();
    const decoded = JSON.parse(Buffer.from(cloudId, 'base64').toString('utf8'));

    expect(decoded.sts_request_method).toBe('POST');
    expect(Buffer.from(decoded.sts_request_url, 'base64').toString('utf8')).toBe('https://sts.amazonaws.com/');
    expect(Buffer.from(decoded.sts_request_body, 'base64').toString('utf8')).toBe(
      'Action=GetCallerIdentity&Version=2011-06-15'
    );

    const headers = JSON.parse(Buffer.from(decoded.sts_request_headers, 'base64').toString('utf8'));
    expect(headers.Authorization[0]).toMatch(/^AWS4-HMAC-SHA256/);
    expect(headers['X-Amz-Security-Token']).toEqual(['session']);
    expect(headers.Host[0]).toBe('sts.amazonaws.com');
  });
});
