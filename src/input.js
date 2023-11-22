const core = require('@actions/core');
const auth = require('./auth');
const yaml = require('js-yaml');

const fetchAndValidateInput = () => {
    let params = {
        accessId: core.getInput('access-id'),
        accessType: core.getInput('access-type'),
        apiUrl: core.getInput('api-url'),
        staticSecrets: parseAndValidateSecrets('static-secrets', ['name', 'output-name'], ['key']),
        dynamicSecrets: parseAndValidateSecrets('dynamic-secrets', ['name', 'output-name'], ['key']),
        rotatedSecrets: parseAndValidateSecrets('rotated-secrets', ['name', 'output-name'], ['key']),
        sshCertificate: parseAndValidateSecrets('ssh-certificates', ['name', 'cert-username', 'public-key-data', 'output-name'], ['key']),
        pkiCertificate: parseAndValidateSecrets('pki-certificates', ['name', 'csr-data-base64', 'output-name'], ['key']),
        token: core.getInput('token'),
        exportSecretsToOutputs: core.getBooleanInput('export-secrets-to-outputs', {default: true}),
        exportSecretsToEnvironment: core.getBooleanInput('export-secrets-to-environment', {default: true})
    };
    if (params['token'] == "") {
        validateRequiredParamsWhenTokenNotExist(params['accessId'], params['accessType'])
    }
    return params;
};

function validateRequiredParamsWhenTokenNotExist(accessId, accessType) {
    if (!accessId) {
        throw new Error('You must provide the access id for your auth method via the access-id input');
    }
    if (accessType == "") {
        throw new Error(`you must provide access-type`);
    }
    if (!auth.allowedAccessTypes.includes(accessType.toLowerCase())) {
        throw new Error(`access-type must be one of: ['${auth.allowedAccessTypes.join("', '")}']`);
    }
}

function parseAndValidateSecrets(inputId, requiredFields, optionalFields) {
    const inputString = core.getInput(inputId);
    if (!inputString) return null;

    try {
        const parsed = yaml.load(inputString);
        validateSecrets(parsed, inputId, requiredFields, optionalFields);
        return parsed;
    } catch (e) {
        throw new Error(`Input ${inputId} did not contain valid YAML: ${e.message}`);
    }
}

function validateSecrets(secrets, inputId, requiredFields, optionalFields) {
    if (!Array.isArray(secrets)) {
        throw new Error(`Input ${inputId} must be an array of objects.`);
    }

    secrets.forEach(secret => {
        const keys = Object.keys(secret);
        requiredFields.forEach(field => {
            if (!keys.includes(field)) {
                throw new Error(`Each item in ${inputId} must have the required field '${field}'.`);
            }
        });

        keys.forEach(key => {
            if (![...requiredFields, ...optionalFields].includes(key)) {
                throw new Error(`Unexpected field '${key}' in ${inputId}.`);
            }
        });
    });
}

module.exports = {
    fetchAndValidateInput
};
