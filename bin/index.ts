#!/usr/bin/env bun

import { EC2Client, DescribeRegionsCommand, DescribeInstancesCommand, TerminateInstancesCommand, DescribeAddressesCommand, ReleaseAddressCommand, DescribeVolumesCommand, DeleteVolumeCommand, DescribeVpcsCommand, DescribeSubnetsCommand, DeleteSubnetCommand, DescribeInternetGatewaysCommand, DetachInternetGatewayCommand, DeleteInternetGatewayCommand, DeleteVpcCommand } from "@aws-sdk/client-ec2";
import { RDSClient, DescribeDBInstancesCommand, DeleteDBInstanceCommand } from "@aws-sdk/client-rds";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand } from "@aws-sdk/client-s3";
import { LambdaClient, ListFunctionsCommand, DeleteFunctionCommand } from "@aws-sdk/client-lambda";
import { ECSClient, ListClustersCommand, ListServicesCommand, UpdateServiceCommand, DeleteServiceCommand, DeleteClusterCommand } from "@aws-sdk/client-ecs";
import { EKSClient, ListClustersCommand as EKSListClustersCommand, ListNodegroupsCommand, DeleteNodegroupCommand, DeleteClusterCommand as EKSDeleteClusterCommand } from "@aws-sdk/client-eks";
import { ElasticLoadBalancingClient, DescribeLoadBalancersCommand as DescribeCLBsCommand, DeleteLoadBalancerCommand as DeleteCLBCommand } from "@aws-sdk/client-elastic-load-balancing";
import { ElasticLoadBalancingV2Client, DescribeLoadBalancersCommand, DeleteLoadBalancerCommand } from "@aws-sdk/client-elastic-load-balancing-v2";
import { CloudFormationClient, ListStacksCommand, DeleteStackCommand } from "@aws-sdk/client-cloudformation";
import { DynamoDBClient, ListTablesCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";

const log = (msg: string) => console.log(msg);
const warn = (msg: string) => console.log(`⚠️  ${msg}`);
const success = (msg: string) => console.log(`✅ ${msg}`);
const info = (msg: string) => console.log(`  ✓ ${msg}`);
const error = (msg: string) => console.log(`❌ ${msg}`);

type RegionResult<T> = { region: string } & T;

function printCredentialsError(): void {
  log("\n==========================================");
  error("AWS CREDENTIALS NOT FOUND");
  log("==========================================\n");
  log("This tool requires valid AWS credentials to run.\n");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("STEP 1: Install AWS CLI (if not installed)");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  log("   brew install awscli          # macOS");
  log("   choco install awscli         # Windows");
  log("   sudo apt install awscli      # Ubuntu/Debian\n");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("STEP 2: Login with ONE of these methods");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  log("┌─────────────────────────────────────────┐");
  log("│ OPTION A: AWS Root Account Login        │");
  log("└─────────────────────────────────────────┘");
  log("   aws login\n");
  log("   Then enter your ROOT account credentials in the browser.\n");
  warn("Use root account for full delete permissions!\n");
  log("┌─────────────────────────────────────────┐");
  log("│ OPTION B: AWS SSO Login                 │");
  log("└─────────────────────────────────────────┘");
  log("   aws configure sso");
  log("   aws sso login --profile <your-profile>\n");
  warn("Make sure the SSO profile has permissions to");
  warn("delete resources (AdministratorAccess or similar)!\n");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  log("📚 More info: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html");
  log("==========================================\n");
}

function isCredentialsError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const name = err.name.toLowerCase();
    return (
      name.includes("credentials") ||
      msg.includes("credentials") ||
      msg.includes("could not load credentials") ||
      msg.includes("failed to load token") ||
      msg.includes("enoent") && msg.includes(".aws") ||
      name === "credentialsprovidererror" ||
      msg.includes("access key") ||
      msg.includes("security token")
    );
  }
  return false;
}

async function checkAwsCredentials(): Promise<boolean> {
  const ec2 = new EC2Client({ region: "us-east-1" });
  try {
    await ec2.send(new DescribeRegionsCommand({}));
    return true;
  } catch (err) {
    if (isCredentialsError(err)) {
      printCredentialsError();
      return false;
    }
    throw err;
  }
}

async function getRegions(): Promise<string[]> {
  const ec2 = new EC2Client({ region: "us-east-1" });
  const { Regions } = await ec2.send(new DescribeRegionsCommand({}));
  return Regions?.map((r) => r.RegionName!) || [];
}

async function scanEC2(regions: string[]): Promise<RegionResult<{ ids: string[] }>[]> {
  const results: RegionResult<{ ids: string[] }>[] = [];
  for (const region of regions) {
    const ec2 = new EC2Client({ region });
    try {
      const { Reservations } = await ec2.send(new DescribeInstancesCommand({
        Filters: [{ Name: "instance-state-name", Values: ["running", "stopped", "stopping"] }]
      }));
      const ids = Reservations?.flatMap((r) => r.Instances?.map((i) => i.InstanceId!) || []) || [];
      if (ids.length) results.push({ region, ids });
    } catch { }
  }
  return results;
}

async function scanRDS(regions: string[]): Promise<RegionResult<{ ids: string[] }>[]> {
  const results: RegionResult<{ ids: string[] }>[] = [];
  for (const region of regions) {
    const rds = new RDSClient({ region });
    try {
      const { DBInstances } = await rds.send(new DescribeDBInstancesCommand({}));
      const ids = DBInstances?.map((db) => db.DBInstanceIdentifier!) || [];
      if (ids.length) results.push({ region, ids });
    } catch { }
  }
  return results;
}

async function scanS3(): Promise<string[]> {
  const s3 = new S3Client({ region: "us-east-1" });
  try {
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    return Buckets?.map((b) => b.Name!) || [];
  } catch { return []; }
}

async function scanLambda(regions: string[]): Promise<RegionResult<{ names: string[] }>[]> {
  const results: RegionResult<{ names: string[] }>[] = [];
  for (const region of regions) {
    const lambda = new LambdaClient({ region });
    try {
      const { Functions } = await lambda.send(new ListFunctionsCommand({}));
      const names = Functions?.map((f) => f.FunctionName!) || [];
      if (names.length) results.push({ region, names });
    } catch { }
  }
  return results;
}

async function scanECS(regions: string[]): Promise<RegionResult<{ arns: string[] }>[]> {
  const results: RegionResult<{ arns: string[] }>[] = [];
  for (const region of regions) {
    const ecs = new ECSClient({ region });
    try {
      const { clusterArns } = await ecs.send(new ListClustersCommand({}));
      if (clusterArns?.length) results.push({ region, arns: clusterArns });
    } catch { }
  }
  return results;
}

async function scanELBv2(regions: string[]): Promise<RegionResult<{ arns: string[] }>[]> {
  const results: RegionResult<{ arns: string[] }>[] = [];
  for (const region of regions) {
    const elb = new ElasticLoadBalancingV2Client({ region });
    try {
      const { LoadBalancers } = await elb.send(new DescribeLoadBalancersCommand({}));
      const arns = LoadBalancers?.map((lb) => lb.LoadBalancerArn!) || [];
      if (arns.length) results.push({ region, arns });
    } catch { }
  }
  return results;
}

async function scanDynamoDB(regions: string[]): Promise<RegionResult<{ tables: string[] }>[]> {
  const results: RegionResult<{ tables: string[] }>[] = [];
  for (const region of regions) {
    const ddb = new DynamoDBClient({ region });
    try {
      const { TableNames } = await ddb.send(new ListTablesCommand({}));
      if (TableNames?.length) results.push({ region, tables: TableNames });
    } catch { }
  }
  return results;
}

async function deleteEC2(items: RegionResult<{ ids: string[] }>[]) {
  for (const { region, ids } of items) {
    const ec2 = new EC2Client({ region });
    try {
      await ec2.send(new TerminateInstancesCommand({ InstanceIds: ids }));
      info(`Terminated ${ids.length} instance(s) in ${region}`);
    } catch (e: any) { warn(`EC2 delete failed in ${region}: ${e.message}`); }
  }
}

async function deleteRDS(items: RegionResult<{ ids: string[] }>[]) {
  for (const { region, ids } of items) {
    const rds = new RDSClient({ region });
    for (const id of ids) {
      try {
        await rds.send(new DeleteDBInstanceCommand({ DBInstanceIdentifier: id, SkipFinalSnapshot: true, DeleteAutomatedBackups: true }));
        info(`Deleted RDS: ${id} in ${region}`);
      } catch (e: any) { warn(`RDS delete failed: ${id} - ${e.message}`); }
    }
  }
}

async function deleteS3(buckets: string[]) {
  for (const bucket of buckets) {
    const s3 = new S3Client({ region: "us-east-1" });
    try {
      let token: string | undefined;
      do {
        const { Contents, NextContinuationToken } = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
        if (Contents?.length) {
          await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: Contents.map((o) => ({ Key: o.Key! })) } }));
        }
        token = NextContinuationToken;
      } while (token);
      await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
      info(`Deleted S3 bucket: ${bucket}`);
    } catch (e: any) { warn(`S3 delete failed: ${bucket} - ${e.message}`); }
  }
}

async function deleteLambda(items: RegionResult<{ names: string[] }>[]) {
  for (const { region, names } of items) {
    const lambda = new LambdaClient({ region });
    for (const name of names) {
      try {
        await lambda.send(new DeleteFunctionCommand({ FunctionName: name }));
        info(`Deleted Lambda: ${name} in ${region}`);
      } catch (e: any) { warn(`Lambda delete failed: ${name} - ${e.message}`); }
    }
  }
}

async function deleteECS(items: RegionResult<{ arns: string[] }>[]) {
  for (const { region, arns } of items) {
    const ecs = new ECSClient({ region });
    for (const cluster of arns) {
      try {
        const { serviceArns } = await ecs.send(new ListServicesCommand({ cluster }));
        for (const svc of serviceArns || []) {
          await ecs.send(new UpdateServiceCommand({ cluster, service: svc, desiredCount: 0 }));
          await ecs.send(new DeleteServiceCommand({ cluster, service: svc, force: true }));
        }
        await ecs.send(new DeleteClusterCommand({ cluster }));
        info(`Deleted ECS cluster: ${cluster}`);
      } catch (e: any) { warn(`ECS delete failed: ${cluster} - ${e.message}`); }
    }
  }
}

async function deleteELBv2(items: RegionResult<{ arns: string[] }>[]) {
  for (const { region, arns } of items) {
    const elb = new ElasticLoadBalancingV2Client({ region });
    for (const arn of arns) {
      try {
        await elb.send(new DeleteLoadBalancerCommand({ LoadBalancerArn: arn }));
        info(`Deleted ALB/NLB: ${arn}`);
      } catch (e: any) { warn(`ELB delete failed: ${arn} - ${e.message}`); }
    }
  }
}

async function deleteDynamoDB(items: RegionResult<{ tables: string[] }>[]) {
  for (const { region, tables } of items) {
    const ddb = new DynamoDBClient({ region });
    for (const table of tables) {
      try {
        await ddb.send(new DeleteTableCommand({ TableName: table }));
        info(`Deleted DynamoDB table: ${table} in ${region}`);
      } catch (e: any) { warn(`DynamoDB delete failed: ${table} - ${e.message}`); }
    }
  }
}

async function main() {
  log("==========================================");
  log("AWS Complete Resource Cleanup Tool");
  log("==========================================\n");
  warn("EXTREME WARNING");
  log("This tool will DELETE ALL resources in your AWS account!\n");

  log("🔐 Checking AWS credentials...\n");
  const hasCredentials = await checkAwsCredentials();
  if (!hasCredentials) {
    process.exit(1);
  }
  success("AWS credentials validated!\n");

  log("📋 Scanning for resources across all regions...\n");
  const regions = await getRegions();

  const [ec2, rds, s3, lambda, ecs, elb, ddb] = await Promise.all([
    scanEC2(regions), scanRDS(regions), scanS3(), scanLambda(regions),
    scanECS(regions), scanELBv2(regions), scanDynamoDB(regions)
  ]);

  let total = 0;
  if (ec2.length) { log("=== EC2 Instances ==="); ec2.forEach((r) => { info(`${r.region}: ${r.ids.length}`); total += r.ids.length; }); log(""); }
  if (rds.length) { log("=== RDS Databases ==="); rds.forEach((r) => { info(`${r.region}: ${r.ids.length}`); total += r.ids.length; }); log(""); }
  if (s3.length) { log("=== S3 Buckets ==="); info(`Found ${s3.length} bucket(s)`); total += s3.length; log(""); }
  if (lambda.length) { log("=== Lambda Functions ==="); lambda.forEach((r) => { info(`${r.region}: ${r.names.length}`); total += r.names.length; }); log(""); }
  if (ecs.length) { log("=== ECS Clusters ==="); ecs.forEach((r) => { info(`${r.region}: ${r.arns.length}`); total += r.arns.length; }); log(""); }
  if (elb.length) { log("=== Load Balancers ==="); elb.forEach((r) => { info(`${r.region}: ${r.arns.length}`); total += r.arns.length; }); log(""); }
  if (ddb.length) { log("=== DynamoDB Tables ==="); ddb.forEach((r) => { info(`${r.region}: ${r.tables.length}`); total += r.tables.length; }); log(""); }

  log("==========================================");
  log(`Summary: Found ${total} resource(s)`);
  log("==========================================\n");

  if (total === 0) { success("No resources found. Your AWS account is already clean!"); return; }

  warn("FINAL WARNING: This will permanently delete all resources!");
  process.stdout.write("Type 'DELETE EVERYTHING' to confirm: ");

  const confirm = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });

  if (confirm !== "DELETE EVERYTHING") { log("\n❌ Aborted. No changes made."); return; }

  log("\n🗑️  Starting deletion process...\n");
  await deleteEC2(ec2);
  await deleteRDS(rds);
  await deleteS3(s3);
  await deleteLambda(lambda);
  await deleteECS(ecs);
  await deleteELBv2(elb);
  await deleteDynamoDB(ddb);

  log("\n==========================================");
  success("Cleanup complete!");
  log("==========================================");
  process.exit(0);
}

main().catch((e) => {
  if (isCredentialsError(e)) {
    printCredentialsError();
  } else {
    console.error("Unexpected error:", e);
  }
  process.exit(1);
});