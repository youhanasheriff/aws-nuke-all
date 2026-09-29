# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for security problems.

Report privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**. Include a description, reproduction steps, and the affected version.

You can expect an initial response within 7 days.

## Scope Note

`aws-nuke-all` is intentionally destructive: it deletes resources in the AWS account whose credentials it runs with. Reports about unsafe defaults, missing confirmation prompts, or actions that could affect an account the user did not intend are treated as security issues.

## Supported Versions

Only the latest published release receives security fixes.
