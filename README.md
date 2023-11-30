# GitHub Actions Plugin

## Table of Contents
- [Introduction](#introduction)
    - [Before Adding Akeyless GitHub Action](#before-adding-akeyless-github-action)
        - [Inputs](#inputs)
        - [Outputs](#outputs)
            - [Default Outputs](#default-outputs)
            - [Extracting from json by field name](#extracting-from-json-by-field-name)
        - [Debugging](#debugging)
        - [Examples](#examples)
            - [Static Secrets Demo](#static-secrets-demo)
            - [Dynamic Secrets Demo](#dynamic-secrets-demo)
            - [Rotated Secrets Demo](#rotated-secrets-demo)
            - [SSH Certificates Demo](#ssh-certificates-demo)
            - [PKI Certificates Demo](#pki-certificates-demo)
        - [Akeyless Setup](#akeyless-setup)
            - [Authentication Methods](#authentication-methods)
                - [JWT Auth Method](#jwt-auth-method)
                - [AWS IAM Auth Method](#aws-iam-auth-method)
                - [AZURE AD Auth Method](#azure-ad-auth-method)
                - [GCP Auth Method](#gcp-auth-method)
                - [K8S Auth Method](#K8S-auth-method)
                - [Universal Identity Auth Method](#universal-identity-auth-method)
                - [Access Key Auth Method](#access-key-auth-method)
                - [Akeyless token](#akeless-token)
            - [TLS Certificate](#tls-certificate)
            - [Setting up JWT Auth](#setting-up-jwt-auth)

## Introduction

GitHub Actions enables you to automate workflows for your GitHub-hosted repositories. With the Github Actions plugin, you can fetch secrets directly from Akeyless into your workflows.
This guide describes how to use our various Authentication Methods to fetch [Static](https://docs.akeyless.io/docs/static-secrets), [Dynamic](https://docs.akeyless.io/docs/how-to-create-dynamic-secret), and [Rotated](https://docs.akeyless.io/docs/rotated-secrets) secrets, as well as [SSH](https://docs.akeyless.io/docs/how-to-configure-ssh) and [PKI](https://docs.akeyless.io/docs/ssh-and-pkitls-certificates) certificates, from Akeyless.

## Before Adding Akeyless GitHub Action

> ⚠️ **Important**: Setting `ACTIONS_RUNNER_DEBUG` to `true` can expose sensitive information in your error logs. Use with caution.

### Inputs

| Name                              | Required | Type      | Value                                                                                                                      |
|-----------------------------------|----------|-----------|----------------------------------------------------------------------------------------------------------------------------|
| **access-id**                     | No       | `string`  | The `access id` for your auth method. If token is not provided this field is required.                                     |
| **access-type**                   | No       | `string`  | Default: `jwt`. The login method to use. Valid options are `jwt`/`access_key`/`universal_identity`/`aws_iam`/`azure_ad`/`gcp`/`k8s`. |
| **token**                         | No       | `string`  | A valid Akeyless token.                                                                                                   |
| **api-url**                       | No       | `string`  | Default: `https://api.akeyless.io`. The API endpoint to use.                                                               |
| **static-secrets**                | No       | `string`  | A YAML list representing static secrets to fetch.                                                                          |
| **dynamic-secrets**               | No       | `string`  | A YAML list representing dynamic secrets to fetch.                                                                         |
| **rotated-secrets**               | No       | `string`  | A YAML list representing rotated secrets to fetch.                                                                         |
| **ssh-certificates**              | No       | `string`  | A YAML list representing ssh certificates to fetch.                                                                        |
| **pki-certificates**              | No       | `string`  | A YAML list representing pki certificates to fetch.                                                                        |
| **export-secrets-to-outputs**     | No       | `boolean` | Default: `true`. True/False to denote if secrets should be exported as environment variables.                              |
| **export-secrets-to-environment** | No       | `boolean` | Default: `true`. True/False to denote if secrets should be exported as action outputs.                                     |
| **access-key**                    | No       | `string`  | Access key (relevant only for access-type=`access_key`).                                                                     |
| **gcp-audience**                  | No       | `string`  | GCP audience to use in signed JWT (relevant only for access-type=`gcp`).                                                     |
| **gateway-url**                   | No       | `string`  | Gateway URL for the K8s authenticated (relevant only for access-type=`k8s`/`oauth2`).                                          |
| **k8s-auth-config-name**          | No       | `string`  | The K8s Auth config name (relevant only for access-type=`k8s`).                                                              |
| **uid_token**                     | No       | `string`  | The Universal Identity token (relevant only for access-type=universal_identity).                                           |

### Outputs

The job outputs are determined by the values set in your `static-secrets`/`dynamic-secrets`/`rotated-secrets`/`ssh-certificates`/`pki-certificates` inputs.

##### Default Outputs

The default behavior will create a single output/env variable that uses the name you set for the output.

| Name | Value |
|------|-------|
| outputs | use `${{ steps.JOB_NAME.outputs.SECRET_NAME }}` |
| environment variables | use `${{ env.SECRET_NAME }}` |

## Extracting from JSON by field name

For each Akeyless secret you can extract a specific field out of the JSON by adding the field key name.

For example, for the following static secret value name "github-static-secret-json":
```json
{
  "imp": "needed",
  "no": "no_need"
}
```

We can use:

```yaml
    - name: "/akeyless-github-action/github-static-secret-json"
      output-name: "my_first_secret"
      key: "imp"
```

and in "steps.output.my_first_secret" the value will be "needed".


### Debugging
There is an option to get more detailed logs from the Akeyless Github Action by setting the `ACTIONS_RUNNER_DEBUG` secret or variable to `true` in the repository that contains the workflow.
> ⚠️ **Important**: Setting `ACTIONS_RUNNER_DEBUG` to `true` can expose sensitive information in your error logs. Use with caution.

## Examples

Although this repository's workflows use placeholder values, it is still a real Akeyless account and real providers. The approaches demonstrated are still valid as-is for real implementations. Use these to your advantage!

### Static Secrets Demo

Static secrets are the easiest to use. Just define the secret's path and the secret's output.

```yaml
jobs:
  fetch_secrets:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Fetch static secrets from Akeyless
        uses: akeyless-community/akeyless-github-action@v1.0.0
        id: fetch-secrets
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: jwt
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp"
            - name: "/akeyless-github-action/github-static-secret"
              output-name: "my_second_secret"
      - name: Use Akeyless secret
        run: |
            echo "Step Outputs"
            echo "my_first_secret: ${{ steps.fetch-secrets.outputs.my_first_secret }}" >> secrets.txt
            echo "my_second_secret: ${{ steps.fetch-secrets.outputs.my_second_secret }}" >> secrets.txt
            
            echo "Environment Variables"
            echo "my_first_secret: ${{ env.my_first_secret }}" >> secrets.txt
            echo "my_second_secret: ${{ env.my_second_secret }}" >> secrets.txt
```

### Dynamic Secrets Demo

This example demonstrates fetching an AWS Dynamic Secret from Akeyless.

```yaml
  fetch_aws_dynamic_secrets:
    runs-on: ubuntu-latest
    name: Fetch AWS dynamic secrets
    
    permissions:
      id-token: write
      contents: read
      
    steps:
    - name: Fetch dynamic secrets from Akeyless
      id: fetch-dynamic-secrets
      uses: akeyless-community/akeyless-github-action@v1.0.0
      with:
        access-id: ${{vars.AKEYLESS_ACCESS_ID}}
        dynamic-secrets: |
          - name: "/path/to/dynamic/aws/secret"
            output-name: "aws_dynamic_secrets"
        access-type: jwt
        
# ********* KEY TAKEAWAY  ********* #
# STEP 1 - Export Dynamic Secret's keys to env vars
    - name: Export Secrets to Environment
      run: |
        echo '${{ steps.fetch-dynamic-secrets.outputs.aws_dynamic_secrets }}' | jq -r 'to_entries|map("AWS_\(.key|ascii_upcase)=\(.value|tostring)")|.[]' >> $GITHUB_ENV

# STEP 2 - You can now access each secret separately as environment variables
    - name: Verify Vars
      run: |
        echo "access_key_id: ${{ env.AWS_ACCESS_KEY_ID }}" >> secrets.txt
        echo "id: ${{ env.AWS_ID }}" >> secrets.txt
        echo "secret_access_key: ${{ env.AWS_SECRET_ACCESS_KEY }}" >> secrets.txt
        echo "security_token: ${{ env.AWS_SECURITY_TOKEN }}" >> secrets.txt
        echo "ttl_in_minutes: ${{ env.AWS_TTL_IN_MINUTES }}" >> secrets.txt
        echo "type: ${{ env.AWS_TYPE }}" >> secrets.txt
        echo "user: ${{ env.AWS_USER }}" >> secrets.txt
```

### Rotated Secrets Demo
This example demonstrates fetching an AWS Rotated Secret from Akeyless.

```yaml
  fetch_aws_rotated_secrets:
    runs-on: ubuntu-latest
    name: Fetch AWS rotated secrets
    
    permissions:
      id-token: write
      contents: read
      
    steps:
    - name: Fetch rotated secrets from Akeyless
      id: fetch-rotated-secrets
      uses: akeyless-community/akeyless-github-action@v1.0.0
      with:
        access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
        access-type: jwt
      rotated-secrets: |
        - name: "/path/to/rotated/aws/secret"
          output-name: "aws_rotated_secrets"
```


### SSH Certificates Demo
```yaml
  fetch_ssh_secrets:
    runs-on: ubuntu-latest
    name: Fetch ssh certificate

    permissions:
      id-token: write
      contents: read

    steps:
      - name: Fetch ssh certificates from Akeyless
        id: fetch-ssh-certificate
        uses: akeyless-community/akeyless-github-action@v1.0.0
        with:
          access-type: jwt
          ssh-certificate-secrets: |
            - name: "/path/to/ssh/secret1"
              output-name: "ssh_secret"
              cert-username: "ubuntu",
              public-key-data: "public_key_data",
            - name: "/path/to/ssh/secret2"
              output-name: "ssh_secret2"
              cert-username: "ubuntu",
              public-key-data: "public_key_data",
```

### PKI Certificates Demo

```yaml
  fetch_pki_secrets:
    runs-on: ubuntu-latest
    name: Fetch pki certificate

    permissions:
      id-token: write
      contents: read

    steps:
      - name: Fetch pki certificates from Akeyless
        id: fetch-pki-certificates
        uses: akeyless-community/akeyless-github-action@v1.0.0
        with:
          access-type: jwt
          pki-certificate-secrets: |
            - name: "/path/to/pki/secret1"
              output-name: "pki_secret"
              csr-data-base64: "csr_data_base64"
            - name: "/path/to/pki/secret2"
              output-name: "pki_secret2"
              csr-data-base64: "csr_data_base64"
```

## Akeyless Setup

### Authentication Methods

This action supports the following authentication methods. Pay close attention as for some authentication methods there are extra inputs needed aside from the `access-type`.

### JWT Auth Method
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: jwt
          static-secrets: |
           - name: "/akeyless-github-action/github-static-secret-json"
             output-name: "my_first_secret"
             key: "imp"
```

The default usage relies on using the GitHub JWT to login to Akeyless. To make this available, you have to configure it in your job workflow:

```
jobs:
  my_job:
    #---------Required---------#
    permissions: 
      id-token: write
      contents: read
    #--------------------------#
```
> ⚠️ If this is not present, the akeyless-action step will fail with the following error: `Failed to login to Akeyless: Error: Failed to fetch Github JWT: Error message: Unable to get ACTIONS\_ID\_TOKEN\_REQUEST\_URL env variable`.


### AWS IAM Auth Method
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: aws_iam
          static-secrets: |
             - name: "/akeyless-github-action/github-static-secret-json"
               output-name: "my_first_secret"
               key: "imp"
```

### Azure AD Auth Method
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: azure_ad
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp"
```

### GCP Auth Method
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: gcp
          gcp-audience: "gcp-audience"
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp"
```

### K8s Auth Method
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: k8s
          k8s-auth-config-name: "k8s-auth-config-name"
          gateway-url: "gateway-url"
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp"
```

### Universal Identity Auth Method
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: universal_identity
          uid_token: "uid_token"
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp" 
```

### Access Key Auth Method
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-key: ${{ secrets.AKEYLESS_ACCESS_KEY }}
          access-type: access_key
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp"
```

### Akeyless Token
```yaml
        with:
          token: ${{ steps.JOB_NAME.outputs.token }}
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp"
```

### TLS Certificate
When TLS is configured on the Akeyless Gateway, you need to also pass the CA certificate (the CA certificate should be in PEM format):
```yaml
        with:
          access-id: ${{ vars.AKEYLESS_ACCESS_ID }}
          access-type: universal_identity
          uid_token: "uid_token"
          ca-certificate: ${{ secrets.AKEYLESS_CA_CERTIFICATE }}
          static-secrets: |
            - name: "/akeyless-github-action/github-static-secret-json"
              output-name: "my_first_secret"
              key: "imp"
```

### Setting up JWT Auth from the Akeyless Console

To configure Akeyless and grant your repositories the necessary permissions to execute this action:

1. Create a GitHub JWT Auth method in Akeyless if you don't already have one (you can safely share the auth method between repositories):
    1. In Akeyless go to "Auth Methods" -> "+ New" -> "OAuth 2.0/JWT".
    2. Specify a name (e.g. "GitHub JWT Auth") and location of your choice.
    3. For the JWKS Url, specify `https://token.actions.githubusercontent.com/.well-known/jwks`
    4. For the unique identifier, use `repository`. See note (1) below for more details.
    5. You **MUST** click "Require Sub Claim on role association".  This will prevent you from attaching this to a role without any additional checks. If you accidentally forgot to set sub-claim checks, then any GitHub runner owned by *anyone* would be able to authenticate to Akeyless and access your resources... **that make this a critical checkbox**.  See the [GitHub docs](https://docs.GitHub.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud) for more details.
2. Create an appropriate access role (if you don't already have one):
    1. In Akeyless go to "Access Roles" -> "+ New"
    2. Give it a name and location, and create it.
    3. Find your new access role and click on it to edit it.
    4. On the right side, under "Secrets & Keys", click the "Add" button to configure `read` access to any static or dynamic secrets you will fetch from your pipeline.
3. Attach your GitHub JWT Auth method to your role:
    1. Once again, find the access role you created in step #2 above and click on it to edit it.
    2. Hit the "+ Associate" button to associate your "GitHub JWT Auth" method with the role.
    3. In the list, find the auth method you created in Step #1 above.
    4. Add an appropriate sub-claim, based on [the claims available in the JWT](https://docs.GitHub.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#understanding-the-oidc-token). See note (2) below for more details.
    5. Save!

After following these steps, you'll be ready to use JWT Auth from your GitHub runners!

**(1) Note:** The unique identifier is mainly used for auditing/billing purposes, so there isn't one correct answer here.  `repository` is a sensible default but if you are uncertain, [contact support](https://www.akeyless.io/submit-a-ticket/) for more details.

**(2) Note:** Sub-claim checks allow Akeyless to grant access to specific workflows based on the claims that GitHub provides in the JWT. Using the example JWT from [the documentation](https://docs.GitHub.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#understanding-the-oidc-token), you could set a sub-claim check in Akeyless, using the example below, to limit access to workflows that were triggered from the main branch in the `octo-org/octo-repo` repository:

```
repository=octo-org/octo-repo
ref=refs/heads/main
```
