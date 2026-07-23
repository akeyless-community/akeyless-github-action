const core = require('@actions/core');
const { akeylessLogin } = require('./auth')
const input = require('./input');
const { handleExportSecrets, handleCreateSecrets, handleUpdateSecrets } = require('./secrets');




async function run() {
    core.debug(`Getting Input for Akeyless GitHub Action`);

    const {
        accessId,
        accessType,
        apiUrl,
        staticSecrets,
        dynamicSecrets,
        rotatedSecrets,
        sshCertificate,
        pkiCertificate,
        token,
        exportSecretsToOutputs,
        exportSecretsToEnvironment,
        parseJsonSecrets,
        secretsToCreate,
        secretsToUpdate
    } = input.fetchAndValidateInput();

    core.debug(`Access ID: ${accessId}`);
    core.debug(`Fetching Akeyless token with access type: ${accessType}`);

    let akeylessToken;
    try {
        if (token !== '') {
            akeylessToken = token;
        } else {
            const akeylessLoginResponse = await akeylessLogin(accessId, accessType, apiUrl);
            akeylessToken = akeylessLoginResponse['token'];
        }
    } catch (error) {
        core.debug(`Failed to login to Akeyless: ${error}`);
        core.setFailed(`Failed to login to Akeyless: ${error && error.message ? error.message : error}`);
        return;
    }

    if (secretsToCreate.length > 0) {
        await handleCreateSecrets({
            akeylessToken,
            secretsToCreate,
            apiUrl,
        });
    }

    if (secretsToUpdate.length > 0) {
        await handleUpdateSecrets({
            akeylessToken,
            secretsToUpdate,
            apiUrl,
        });
    }

    const args = {
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
    };

    await handleExportSecrets(args);

    core.debug(`Done processing all secrets`);
}

if (require.main === module) {
    try {
        core.debug('Starting main run');
        run();
    } catch (error) {
        core.debug(error.stack);
        core.setFailed('Akeyless action has failed');
        core.debug(error.message);
    }
}
