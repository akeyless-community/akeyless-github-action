const core = require('@actions/core');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');

async function handleExportSecrets(args) {
    const {
        akeylessToken,
        staticSecrets,
        dynamicSecrets,
        rotatedSecrets,
        apiUrl,
        exportSecretsToOutputs,
        exportSecretsToEnvironment,
        sshCertificate,
        pkiCertificate,
        parseJsonSecrets
    } = args;

    // Define a mapping of key-to-function
    const secretHandlers = {
        staticSecrets: exportStaticSecrets,
        dynamicSecrets: exportDynamicSecrets,
        rotatedSecrets: exportRotatedSecrets,
        sshCertificate: exportSshCertificateSecrets,
        pkiCertificate: exportPkiCertificateSecrets,
    };

    for (const [key, handler] of Object.entries(secretHandlers)) {
        const secrets = args[key];
        if (secrets) {
            core.debug(`${key}: Fetching!`);
            try {
                await handler(akeylessToken, secrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets);
            } catch (error) {
                core.debug(`Failed to fetch ${key}: ${typeof error === 'object' ? JSON.stringify(error) : error}`);
                core.setFailed(`Failed to fetch secret`);
            }
        } else {
            core.debug(`${key}: Skipping step because no ${key} were specified`);
        }
    }
    exportSecretToOutput('token', akeylessToken, exportSecretsToOutputs, exportSecretsToEnvironment)
}

async function exportStaticSecrets(akeylessToken, staticSecrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets) {
    const api = akeylessApi.api(apiUrl);

    let secretName;
    for (const staticParams of staticSecrets) {
        secretName = staticParams['name']
        const param = akeyless.GetSecretValue.constructFromObject({
            token: akeylessToken,
            names: [secretName]
        });

        const staticSecret = await api.getSecretValue(param).catch(error => {
            core.debug(`getSecretValue Failed: ${JSON.stringify(error)}`);
            core.setFailed(`get secret value Failed`);
        });

        if (staticSecret === undefined) {
            return;
        }

        setOutput(staticSecret[secretName], staticParams, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets)
    }
}

async function exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets) {
    const api = akeylessApi.api(apiUrl);
    try {
        let secretName;
        for (const dynamicParams of dynamicSecrets) {
            secretName = dynamicParams['name']
            const param = akeyless.GetDynamicSecretValue.constructFromObject({
                token: akeylessToken,
                name: secretName
            });

            const dynamicSecret = await api.getDynamicSecretValue(param);

            if (!dynamicSecret) {
                return;
            }

            setOutput(dynamicSecret, dynamicParams, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets)
        }
    } catch (error) {
        core.debug(`Failed to export dynamic secret: ${typeof error === 'object' ? JSON.stringify(error) : error}`);
        core.setFailed('Failed to export dynamic secret');
    }
}
async function exportRotatedSecrets(akeylessToken, rotatedSecrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets) {
    const api = akeylessApi.api(apiUrl);

    let secretName;
    try {
        for (const rotateParams of rotatedSecrets) {
            secretName = rotateParams['name']
            const param = akeyless.GetRotatedSecretValue.constructFromObject({
                token: akeylessToken,
                names: [secretName]
            });

            let rotatedSecret = await api.getRotatedSecretValue(param).catch(error => {
                core.debug(`getRotatedSecret Failed: ${JSON.stringify(error)}`);
                core.setFailed(`get rotated secret failed`);
            });

            if (!rotatedSecret) {
                return
            }
            setOutput(rotatedSecret.value, rotateParams, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets)
        }
    } catch (error) {
        core.debug(`Failed to export rotated secret: ${typeof error === 'object' ? JSON.stringify(error) : error}`);
        core.setFailed('Failed to export rotated secret');
    }
}

async function exportSshCertificateSecrets(akeylessToken, sshCertificate, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets) {
    const api = akeylessApi.api(apiUrl);
    for (const sshParams of sshCertificate) {
        const param = akeyless.GetSSHCertificate.constructFromObject({
            token: akeylessToken,
            'cert-issuer-name': sshParams['name'],
            'cert-username': sshParams['cert-username'],
            'public-key-data': sshParams['public-key-data'],
        })
        const sshCertValue = await api.getSSHCertificate(param)

        setOutput(sshCertValue, sshParams, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets)
    }
}

async function exportPkiCertificateSecrets(akeylessToken, pkiCertificate, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets) {
    const api = akeylessApi.api(apiUrl);
    for (const pkiParams of pkiCertificate) {
        const param = akeyless.GetPKICertificate.constructFromObject({
            token: akeylessToken,
            'cert-issuer-name': pkiParams['name'],
            'csr-data-base64': pkiParams['csr-data-base64'],
        })
        const pkiCertValue = await api.getPKICertificate(param)

        setOutput(pkiCertValue, pkiParams, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets)
    }
}

function setOutput(secretValue, params, exportSecretsToOutputs, exportSecretsToEnvironment, parseJsonSecrets) {
    if (parseJsonSecrets == true && !params.hasOwnProperty('key')) {
        const parsedJson = parseJson(secretValue)
        if (parsedJson != null) {
            validateNoDuplicateKeys(parsedJson)
            exportJsonFields(parsedJson, params['name'], params['prefix-json-secrets'], exportSecretsToOutputs, exportSecretsToEnvironment)
        } else {
            exportSecretToOutput(params['output-name'], secretValue, exportSecretsToOutputs, exportSecretsToEnvironment)
        }
        return
    }

    const secretValueOut = processSecretValue(secretValue, params['key']);
    exportSecretToOutput(params['output-name'], secretValueOut, exportSecretsToOutputs, exportSecretsToEnvironment)
}

function convertPathNameToPrefix(pathName) {
    if (pathName[0] === '/') {
        pathName = pathName.slice(1)
    }

    // Join the parts back with '_' in between
    return pathName.replace(/\//g, "_").toUpperCase()
}

function processSecretValue(secret, key) {
    if (!key) return secret;

    try {
        const secretObj = JSON.parse(secret);
        if (key in secretObj) {
            return secretObj[key];
        } else {
            throw new Error(`Key '${key}' not found in secret`);
        }
    } catch (e) {
        throw new Error(`Error processing secret value: ${e.message}`);
    }
}

function exportSecretToOutput(variableName, secretValue, exportSecretsToOutputs, exportSecretsToEnvironment) {
    // obscure value in visible output and logs
    core.setSecret(secretValue)
    // Switch 1 - set outputs
    if (exportSecretsToOutputs) {
        core.setOutput(variableName, secretValue);
    }

    // Switch 2 - export env variables
    if (exportSecretsToEnvironment) {
        core.exportVariable(variableName, secretValue);
    }
}

function exportJsonFields(parsedJson, secretName, prefix, exportSecretsToOutputs, exportSecretsToEnvironment) {
    if (!prefix) {
        prefix = convertPathNameToPrefix(secretName)
    }
    let outputName;
    for (let key in parsedJson) {
        outputName = prefix + "_" + key.toUpperCase()
        exportSecretToOutput(outputName, parsedJson[key], exportSecretsToOutputs, exportSecretsToEnvironment)
    }
}

function validateNoDuplicateKeys(parsedJson) {
    const keyMap = new Map();

    for (const [key, value] of Object.entries(parsedJson)) {
        const upperCaseKey = key.toUpperCase();
        if (keyMap.has(upperCaseKey)) {
            throw new Error(`Duplicate key found in json: ${key}`);
        }
        keyMap.set(upperCaseKey, value);
    }
}

function parseJson(jsonString) {
    try {
        const parsedJson = JSON.parse(jsonString);
        return parsedJson;
    } catch (e) {
        return null;
    }
}

exports.handleExportSecrets = handleExportSecrets
