# aws-nuke-all

> ⚠️ **EXTREME DANGER** - This tool will permanently delete ALL resources in your AWS account!

A CLI tool to completely wipe all resources from an AWS account. Useful for cleaning up development/test accounts or starting fresh.

## Installation

```bash
# Run directly (no install needed)
bunx aws-nuke-all
npx aws-nuke-all

# Or install globally
bun add -g aws-nuke-all
npm install -g aws-nuke-all
```

## Prerequisites

### 1. AWS CLI

Install the AWS CLI:

```bash
# macOS
brew install awscli

# Windows
choco install awscli

# Ubuntu/Debian
sudo apt install awscli
```

### 2. AWS Credentials

Login using **one** of these methods:

**Option A: Root Account (Recommended for full access)**
```bash
aws login
```

You'll need your ROOT account credentials in the browser.

> ⚠️ Use root account for full delete permissions!

**Option B: SSO with Admin Profile**
```bash
aws configure sso
aws sso login --profile your-profile
```

> ⚠️ Make sure the SSO profile has permissions to delete resources (AdministratorAccess or similar)!

### 3. Required Permissions

The credentials must have **administrator access** to delete all resources. We recommend using:
- Root account credentials, OR
- An IAM user with `AdministratorAccess` policy

## Usage

```bash
bunx aws-nuke-all
```

The tool will:

1. ✅ Validate your AWS credentials
2. 📋 Scan all regions for resources
3. 📊 Display a summary of found resources
4. ⚠️ Ask for confirmation (type `DELETE EVERYTHING`)
5. 🗑️ Delete all resources

## Resources Deleted

| Service | Resources |
|---------|-----------|
| EC2 | Instances, Elastic IPs, Unattached EBS Volumes |
| RDS | Database Instances |
| S3 | Buckets (including all objects) |
| Lambda | Functions |
| ECS | Clusters, Services |
| EKS | Clusters, Node Groups |
| ELB | Application, Network, and Classic Load Balancers |
| CloudFormation | Stacks |
| DynamoDB | Tables |
| VPC | Default VPCs, Subnets, Internet Gateways |

## Example Output

```
==========================================
AWS Complete Resource Cleanup Tool
==========================================

⚠️  EXTREME WARNING
This tool will DELETE ALL resources in your AWS account!

🔐 Checking AWS credentials...

✅ AWS credentials validated!

📋 Scanning for resources across all regions...

=== EC2 Instances ===
  ✓ us-east-1: 3
  ✓ eu-west-1: 1

=== S3 Buckets ===
  ✓ Found 5 bucket(s)

=== Lambda Functions ===
  ✓ us-east-1: 12

==========================================
Summary: Found 21 resource(s)
==========================================

⚠️  FINAL WARNING: This will permanently delete all resources!
Type 'DELETE EVERYTHING' to confirm: 
```

## Error: Credentials Not Found

If you see a credentials error, the tool will display helpful setup instructions:

```
==========================================
❌ AWS CREDENTIALS NOT FOUND
==========================================

This tool requires valid AWS credentials to run.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Install AWS CLI (if not installed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   brew install awscli          # macOS
   choco install awscli         # Windows
   sudo apt install awscli      # Ubuntu/Debian

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Login with ONE of these methods
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────┐
│ OPTION A: AWS Root Account Login        │
└─────────────────────────────────────────┘
   aws login

   Then enter your ROOT account credentials in the browser.

⚠️  Use root account for full delete permissions!

┌─────────────────────────────────────────┐
│ OPTION B: AWS SSO Login                 │
└─────────────────────────────────────────┘
   aws configure sso
   aws sso login --profile <your-profile>

⚠️  Make sure the SSO profile has permissions to
⚠️  delete resources (AdministratorAccess or similar)!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 More info: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html
==========================================
```

## Safety Features

- 🔐 Validates credentials before scanning
- 📋 Shows all resources that will be deleted
- ⚠️ Requires typing `DELETE EVERYTHING` to confirm
- ❌ Aborts immediately if confirmation doesn't match

## License

MIT

## Disclaimer

**USE AT YOUR OWN RISK.** This tool permanently deletes AWS resources. The authors are not responsible for any data loss, unexpected charges, or other damages resulting from the use of this tool. Always verify you're targeting the correct AWS account before running.