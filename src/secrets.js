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
        pkiCertificate
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
                await handler(akeylessToken, secrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment);
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

async function exportStaticSecrets(akeylessToken, staticSecrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment) {
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

        setOutput(staticSecret[secretName], staticParams['key'], staticParams['output-name'], exportSecretsToOutputs, exportSecretsToEnvironment)
    }
}

async function exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment) {
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

            setOutput(dynamicSecret, dynamicParams['key'], dynamicParams['output-name'], exportSecretsToOutputs, exportSecretsToEnvironment)
        }
    } catch (error) {
        core.debug(`Failed to export dynamic secret: ${typeof error === 'object' ? JSON.stringify(error) : error}`);
        core.setFailed('Failed to export dynamic secret');
    }
}
async function exportRotatedSecrets(akeylessToken, rotatedSecrets, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment) {
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
            setOutput(rotatedSecret.value, rotateParams['key'], rotateParams['output-name'], exportSecretsToOutputs, exportSecretsToEnvironment)
        }
    } catch (error) {
        core.debug(`Failed to export rotated secret: ${typeof error === 'object' ? JSON.stringify(error) : error}`);
        core.setFailed('Failed to export rotated secret');
    }
}

async function exportSshCertificateSecrets(akeylessToken, sshCertificate, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment) {
    const api = akeylessApi.api(apiUrl);
    for (const sshParams of sshCertificate) {
        const param = akeyless.GetSSHCertificate.constructFromObject({
            token: akeylessToken,
            'cert-issuer-name': sshParams['name'],
            'cert-username': sshParams['cert-username'],
            'public-key-data': sshParams['public-key-data'],
        })
        const sshCertValue = await api.getSSHCertificate(param)

        setOutput(sshCertValue, sshParams['key'], sshParams['output-name'], exportSecretsToOutputs, exportSecretsToEnvironment)
    }
}

async function exportPkiCertificateSecrets(akeylessToken, pkiCertificate, apiUrl, exportSecretsToOutputs, exportSecretsToEnvironment) {
    const api = akeylessApi.api(apiUrl);
    for (const pkiParams of pkiCertificate) {
        const param = akeyless.GetPKICertificate.constructFromObject({
            token: akeylessToken,
            'cert-issuer-name': pkiParams['name'],
            'csr-data-base64': pkiParams['csr-data-base64'],
        })
        const pkiCertValue = await api.getPKICertificate(param)

        setOutput(pkiCertValue, pkiParams['key'], pkiParams['output-name'], exportSecretsToOutputs, exportSecretsToEnvironment)
    }
}

function setOutput(secret, key, outputName, exportSecretsToOutputs, exportSecretsToEnvironment) {
    const secretValue = processSecretValue(secret, key);
    exportSecretToOutput(outputName, secretValue, exportSecretsToOutputs, exportSecretsToEnvironment)
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

exports.handleExportSecrets = handleExportSecrets
