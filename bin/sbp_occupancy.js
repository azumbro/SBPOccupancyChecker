#!/usr/bin/env node

const cdk = require("aws-cdk-lib")
const { ACCOUNT_SETTINGS, SBPOccupancyStack } = require("../lib/sbp_occupancy-stack")

const app = new cdk.App()
new SBPOccupancyStack(app, "SBPOccupancyStack", { env: ACCOUNT_SETTINGS })
