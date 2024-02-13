const core = require('@actions/core');
const input = require('../src/input');
const yaml = require('js-yaml');
jest.mock('@actions/core');

describe('testing input', () => {
    let inputToOutputMap;

    beforeEach(() => {
        inputToOutputMap = {
            'access-id': 'p-12345',
            'access-type': 'gcp',
            'api-url': 'https://api.akeyless.io',
            'static-secrets': '- name: "secret/data/ci/aws"\n  output-name: "fasdf"',
            'dynamic-secrets': '- name: "secret/data/ci/aws2"\n  output-name: "fasdf"',
            'rotated-secrets': '- name: "secret/data/ci/aws3"\n  output-name: "fasdf"',
            'ssh-certificates': '- name: "sshCert"\n  cert-username: "ubuntu"\n  public-key-data: "ssh-rsa AAAAB"\n  output-name: "fasdf"',
            'pki-certificates': '- name: "pkiCert"\n  csr-data-base64: "LS0tL"\n  output-name: "fasdf"',
            'token': '',
            'export-secrets-to-outputs': true,
            'export-secrets-to-environment': true,
            'parse-json-secrets': true
        };
        mockCoreInput(inputToOutputMap);
    });

    it('should parse and validate all inputs correctly', () => {
        const params = input.fetchAndValidateInput();

        expect(params).toMatchObject({
            accessId: 'p-12345',
            accessType: 'gcp',
            apiUrl: 'https://api.akeyless.io',
            staticSecrets: expect.any(Array),
            dynamicSecrets: expect.any(Array),
            rotatedSecrets: expect.any(Array),
            sshCertificate: expect.any(Array),
            pkiCertificate: expect.any(Array),
            token: '',
            exportSecretsToOutputs: true,
            exportSecretsToEnvironment: true,
            parseJsonSecrets: true
        });
    });

    it('should throw an error when token is not provided and required fields are missing', () => {
        inputToOutputMap['access-id'] = ''

        mockCoreInput(inputToOutputMap);

        expect(() => {
            input.fetchAndValidateInput();
        }).toThrow('You must provide the access id for your auth method via the access-id input');

        inputToOutputMap['access-id'] = '1234'
        inputToOutputMap['access-type'] = ''

        mockCoreInput(inputToOutputMap);

        expect(() => {
            input.fetchAndValidateInput();
        }).toThrow('you must provide access-type');

        inputToOutputMap['access-id'] = '1234'
        inputToOutputMap['access-type'] = 'bla'

        mockCoreInput(inputToOutputMap);

        expect(() => {
            input.fetchAndValidateInput();
        }).toThrow("access-type must be one of");
    });

    const inputTypes = [
        { type: 'static-secrets', requiredFields: ['name'] },
        { type: 'dynamic-secrets', requiredFields: ['name'] },
        { type: 'rotated-secrets', requiredFields: ['name'] },
        { type: 'ssh-certificates', requiredFields: ['name', 'cert-username', 'public-key-data'] },
        { type: 'pki-certificates', requiredFields: ['name', 'csr-data-base64'] },
    ];

    inputTypes.forEach(({ type, requiredFields }) => {
        requiredFields.forEach(requiredField => {
            it(`should throw an error for missing required field '${requiredField}' in ${type}`, () => {
                const modifiedInputMap = {...inputToOutputMap};
                const secrets = yaml.load(modifiedInputMap[type]);
                secrets.forEach(secret => delete secret[requiredField]);
                modifiedInputMap[type] = yaml.dump(secrets);
                mockCoreInput(modifiedInputMap);

                expect(() => {
                    input.fetchAndValidateInput();
                }).toThrow(`Each item in ${type} must have the required field '${requiredField}'.`);
            });
        });
    });

    // Helper function to mock core.getInput
    function mockCoreInput(inputMap) {
        core.getInput.mockImplementation((inputName) => inputMap[inputName]);
        core.getBooleanInput.mockImplementation((inputName) => inputMap[inputName]);
    }
});

