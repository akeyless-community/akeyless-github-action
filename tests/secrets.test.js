jest.mock('@actions/core');
jest.mock('../src/akeyless_api');

core = require('@actions/core');
akeylessApi = require('../src/akeyless_api');
akeyless = require('akeyless');
secrets = require('../src/secrets');

describe('testing secret exports', () => {
  it('should export static secret', async function () {
    const args = {
      akeylessToken: "akeylessToken",
      staticSecrets: [{"name": "/some/static/secret", "output-name": "my_first_secret"}, {"name": "/some2/static2/secret2", "output-name":"my_second_secret", "key": "bla"}],
      dynamicSecrets: undefined,
      rotatedSecrets: undefined,
      apiUrl: 'https://api.akeyless.io',
      exportSecretsToOutputs: true,
      exportSecretsToEnvironment: true,
      parseDynamicSecrets: false,
      sshCertificate: undefined,
      pkiCertificate: undefined
    }
    const api = {
      getSecretValue: jest.fn(),
    };
    akeylessApi.api.mockReturnValue(api);
    api.getSecretValue.mockResolvedValueOnce({
      "/some/static/secret": 'secret-value-1',
    });
    api.getSecretValue.mockResolvedValueOnce({
      "/some2/static2/secret2": '{"bla":"secret-value-2", "no":"nope"}',
    });
    core.setSecret = jest.fn();
    core.setOutput = jest.fn();
    core.exportVariable = jest.fn();

    await secrets.handleExportSecrets(args)

    expect(akeylessApi.api).toHaveBeenCalledWith(args.apiUrl);

    // Check if getSecretValue is called with the correct parameters
    expect(api.getSecretValue).toHaveBeenCalledTimes(2);
    expect(api.getSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      names: ["/some/static/secret"],
    });
    expect(api.getSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      names: ["/some2/static2/secret2"],
    });

    // Check if core functions are called with the correct values
    expect(core.setSecret).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith('my_first_secret', 'secret-value-1');
    expect(core.setOutput).toHaveBeenCalledWith("my_second_secret", 'secret-value-2');
    expect(core.exportVariable).toHaveBeenCalledWith('my_first_secret', 'secret-value-1');
    expect(core.exportVariable).toHaveBeenCalledWith('my_second_secret', 'secret-value-2');
  });

  it('should export static secret with parse-json-secrets', async function () {
    const  staticSecrets = [{"name": "/some/static/secret", "output-name": "my_first_secret"},
      {"name": "/some2/static2/secret2", "prefix-json-secrets": "Mysql"}, {"name": "/some3/static3/secret3"},
      {"name": "/some4/static4/secret4", "output-name":"secret_out_of_key_in_json", "key": "secretName6"}]
    const args = {
      akeylessToken: "akeylessToken",
      staticSecrets: staticSecrets,
      apiUrl: 'https://api.akeyless.io',
      exportSecretsToOutputs: true,
      exportSecretsToEnvironment: true,
      parseDynamicSecrets: false,
      parseJsonSecrets: true
    }
    const api = {
      getSecretValue: jest.fn(),
    };
    akeylessApi.api.mockReturnValue(api);
    api.getSecretValue.mockResolvedValueOnce({
      "/some/static/secret": 'secret-value-1',
    });
    api.getSecretValue.mockResolvedValueOnce({
      "/some2/static2/secret2": '{"secretName":"secret-value-2", "secretName2":"secret-value-3"}',
    });

    api.getSecretValue.mockResolvedValueOnce({
      "/some3/static3/secret3": '{"secretName4":"secret-value-4", "secretName5":"secret-value-5"}',
    });
    api.getSecretValue.mockResolvedValueOnce({
      "/some4/static4/secret4": '{"secretName6":"secret-value-6", "secretName7":"noParsed"}',
    });
    core.setSecret = jest.fn();
    core.setOutput = jest.fn();
    core.exportVariable = jest.fn();

    await secrets.handleExportSecrets(args)

    expect(akeylessApi.api).toHaveBeenCalledWith(args.apiUrl);

    // Check if getSecretValue is called with the correct parameters
    expect(api.getSecretValue).toHaveBeenCalledTimes(4);
    expect(api.getSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      names: ["/some/static/secret"],
    });
    expect(api.getSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      names: ["/some2/static2/secret2"],
    });

    // Check if core functions are called with the correct values
    expect(core.setSecret).toHaveBeenCalledTimes(7);
    expect(core.setOutput).toHaveBeenCalledWith('my_first_secret', 'secret-value-1');
    expect(core.setOutput).toHaveBeenCalledWith("Mysql_SECRETNAME", 'secret-value-2');
    expect(core.setOutput).toHaveBeenCalledWith("Mysql_SECRETNAME2", 'secret-value-3');
    expect(core.setOutput).toHaveBeenCalledWith("SOME3_STATIC3_SECRET3_SECRETNAME4", 'secret-value-4');
    expect(core.setOutput).toHaveBeenCalledWith("SOME3_STATIC3_SECRET3_SECRETNAME5", 'secret-value-5');
    expect(core.setOutput).toHaveBeenCalledWith("secret_out_of_key_in_json", 'secret-value-6');
    expect(core.exportVariable).toHaveBeenCalledWith('my_first_secret', 'secret-value-1');
    expect(core.exportVariable).toHaveBeenCalledWith("Mysql_SECRETNAME", 'secret-value-2');
    expect(core.exportVariable).toHaveBeenCalledWith("Mysql_SECRETNAME2", 'secret-value-3');
  });

  it('should export dynamic secret', async function () {
    const args = {
      akeylessToken: "akeylessToken",
      staticSecrets: undefined,
      dynamicSecrets: [{"name":"/some/dynamic/secret","output-name":"my_first_secret"}, {"name":"/some2/dynamic2/secret2","output-name":"my_second_secret"}],
      rotatedSecrets: undefined,
      apiUrl: 'https://api.akeyless.io',
      exportSecretsToOutputs: true,
      exportSecretsToEnvironment: true,
      generateSeparateOutput: false,
      sshCertificate: undefined,
      pkiCertificate: undefined
    }
    const api = {
      getDynamicSecretValue: jest.fn(),
    };
    akeylessApi.api.mockReturnValue(api);
    api.getDynamicSecretValue.mockResolvedValueOnce({
      "/some/dynamic/secret": 'secret-value-1',
    });
    api.getDynamicSecretValue.mockResolvedValueOnce({
      "/some2/dynamic2/secret2": 'secret-value-2',
    });
    core.setSecret = jest.fn();
    core.setOutput = jest.fn();
    core.exportVariable = jest.fn();

    await secrets.handleExportSecrets(args)

    expect(akeylessApi.api).toHaveBeenCalledWith(args.apiUrl);

    // Check if getSecretValue is called with the correct parameters
    expect(api.getDynamicSecretValue).toHaveBeenCalledTimes(2);
    expect(api.getDynamicSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      name: "/some/dynamic/secret",
    });
    expect(api.getDynamicSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      name: "/some2/dynamic2/secret2",
    });

    // Check if core functions are called with the correct values
    expect(core.setSecret).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith('my_first_secret', {"/some/dynamic/secret": 'secret-value-1'});
    expect(core.setOutput).toHaveBeenCalledWith("my_second_secret", {"/some2/dynamic2/secret2": 'secret-value-2'});
    expect(core.exportVariable).toHaveBeenCalledWith('my_first_secret', {"/some/dynamic/secret": 'secret-value-1'});
    expect(core.exportVariable).toHaveBeenCalledWith('my_second_secret', {"/some2/dynamic2/secret2": 'secret-value-2'});
  });

  it('should export rotated secret', async function () {
    const args = {
      akeylessToken: "akeylessToken",
      staticSecrets: undefined,
      dynamicSecrets: undefined,
      rotatedSecrets: [{"name":"/some/rotated/secret","output-name":"my_first_secret"}, {"name":"/some2/rotated2/secret2","output-name":"my_second_secret"}],
      apiUrl: 'https://api.akeyless.io',
      exportSecretsToOutputs: true,
      exportSecretsToEnvironment: true,
      generateSeparateOutput: false,
      sshCertificate: undefined,
      pkiCertificate: undefined
    }
    const api = {
      getRotatedSecretValue: jest.fn(),
    };
    akeylessApi.api.mockReturnValue(api);
    api.getRotatedSecretValue.mockResolvedValueOnce({
      value: {"/some/rotated/secret": 'secret-value-1'},
    });
    api.getRotatedSecretValue.mockResolvedValueOnce({
      value: {"/some2/rotated2/secret2": 'secret-value-2'},
    });
    core.setSecret = jest.fn();
    core.setOutput = jest.fn();
    core.exportVariable = jest.fn();

    await secrets.handleExportSecrets(args)

    expect(akeylessApi.api).toHaveBeenCalledWith(args.apiUrl);

    // Check if getSecretValue is called with the correct parameters
    expect(api.getRotatedSecretValue).toHaveBeenCalledTimes(2);
    expect(api.getRotatedSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      names: "/some/rotated/secret",
    });
    expect(api.getRotatedSecretValue).toHaveBeenCalledWith({
      token: args.akeylessToken,
      names: "/some2/rotated2/secret2",
    });

    // Check if core functions are called with the correct values
    expect(core.setSecret).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith('my_first_secret', {"/some/rotated/secret": 'secret-value-1'});
    expect(core.setOutput).toHaveBeenCalledWith("my_second_secret", {"/some2/rotated2/secret2": 'secret-value-2'});
    expect(core.exportVariable).toHaveBeenCalledWith('my_first_secret', {"/some/rotated/secret": 'secret-value-1'});
    expect(core.exportVariable).toHaveBeenCalledWith('my_second_secret', {"/some2/rotated2/secret2": 'secret-value-2'});
  });

  it('should export ssh certificate secret', async function () {
    const args = {
      akeylessToken: "akeylessToken",
      staticSecrets: undefined,
      dynamicSecrets: undefined,
      rotatedSecrets: undefined,
      apiUrl: 'https://api.akeyless.io',
      exportSecretsToOutputs: true,
      exportSecretsToEnvironment: true,
      parseDynamicSecrets: false,
      sshCertificate:[
        {
          "name": "sshCert",
          "cert-username": "ubuntu",
          "public-key-data": "publicKey",
          "output-name": "my_first_secret"
        },
        {
          "name": "sshCert2",
          "cert-username": "ubuntu2",
          "public-key-data": "publicKey2",
          "output-name": "my_second_secret"
        }
      ],
      pkiCertificate: undefined
    }
    const api = {
      getSSHCertificate: jest.fn(),
    };
    akeylessApi.api.mockReturnValue(api);
    api.getSSHCertificate.mockResolvedValueOnce("first ssh certificate");
    api.getSSHCertificate.mockResolvedValueOnce("second ssh certificate");
    core.setSecret = jest.fn();
    core.setOutput = jest.fn();
    core.exportVariable = jest.fn();

    await secrets.handleExportSecrets(args)

    expect(akeylessApi.api).toHaveBeenCalledWith(args.apiUrl);

    // Check if getSecretValue is called with the correct parameters
    expect(api.getSSHCertificate).toHaveBeenCalledTimes(2);
    expect(api.getSSHCertificate).toHaveBeenCalledWith({
      token: args.akeylessToken,
      "cert-issuer-name": "sshCert",
      "cert-username": "ubuntu",
      "public-key-data": "publicKey",
    });
    expect(api.getSSHCertificate).toHaveBeenCalledWith({
      token: args.akeylessToken,
      "cert-issuer-name": "sshCert2",
      "cert-username": "ubuntu2",
      "public-key-data": "publicKey2",
    });

    // Check if core functions are called with the correct values
    expect(core.setSecret).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith('my_first_secret', "first ssh certificate");
    expect(core.setOutput).toHaveBeenCalledWith("my_second_secret", "second ssh certificate");
    expect(core.exportVariable).toHaveBeenCalledWith('my_first_secret', "first ssh certificate");
    expect(core.exportVariable).toHaveBeenCalledWith('my_second_secret', "second ssh certificate");
  });

  it('should export pki certificate secret', async function () {
    const args = {
      akeylessToken: "akeylessToken",
      staticSecrets: undefined,
      dynamicSecrets: undefined,
      rotatedSecrets: undefined,
      apiUrl: 'https://api.akeyless.io',
      exportSecretsToOutputs: true,
      exportSecretsToEnvironment: true,
      parseDynamicSecrets: false,
      sshCertificate: undefined,
      pkiCertificate: [
        {
          "name": "pkiCert",
          "csr-data-base64": "csr data",
          "output-name": "my_first_secret"
        },
        {
          "name": "pkiCert2",
          "csr-data-base64": "csr data2",
          "output-name": "my_second_secret"
        }
      ],
    }
    const api = {
      getPKICertificate: jest.fn(),
    };
    akeylessApi.api.mockReturnValue(api);
    api.getPKICertificate.mockResolvedValueOnce("first pki certificate");
    api.getPKICertificate.mockResolvedValueOnce("second pki certificate");
    core.setSecret = jest.fn();
    core.setOutput = jest.fn();
    core.exportVariable = jest.fn();

    await secrets.handleExportSecrets(args)

    expect(akeylessApi.api).toHaveBeenCalledWith(args.apiUrl);

    // Check if getSecretValue is called with the correct parameters
    expect(api.getPKICertificate).toHaveBeenCalledTimes(2);
    expect(api.getPKICertificate).toHaveBeenCalledWith({
      token: args.akeylessToken,
      "cert-issuer-name": "pkiCert",
      "csr-data-base64": "csr data",
    });
    expect(api.getPKICertificate).toHaveBeenCalledWith({
      token: args.akeylessToken,
      "cert-issuer-name": "pkiCert2",
      "csr-data-base64": "csr data2",
    });

    // Check if core functions are called with the correct values
    expect(core.setSecret).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith('my_first_secret', "first pki certificate");
    expect(core.setOutput).toHaveBeenCalledWith("my_second_secret", "second pki certificate");
    expect(core.exportVariable).toHaveBeenCalledWith('my_first_secret', "first pki certificate");
    expect(core.exportVariable).toHaveBeenCalledWith('my_second_secret', "second pki certificate");
  });
})
