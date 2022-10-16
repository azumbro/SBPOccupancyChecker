const { Duration, Stack } = require("aws-cdk-lib")
const lambda = require("aws-cdk-lib/aws-lambda")
const events = require("aws-cdk-lib/aws-events")
const targets = require("aws-cdk-lib/aws-events-targets")
const dynamodb = require("aws-cdk-lib/aws-dynamodb")
const { RetentionDays } = require("aws-cdk-lib/aws-logs")

const ACCOUNT_SETTINGS = {
    region: "us-west-2",
}
const OCCUPANCY_TABLE_NAME = "SBPOccupancyHistory"

class SBPOccupancyStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props)

        const occupancyTable = new dynamodb.Table(this, OCCUPANCY_TABLE_NAME, {
            tableName: OCCUPANCY_TABLE_NAME,
            partitionKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
            timeToLiveAttribute: "ttl",
        })

        const occupancyFunction = new lambda.Function(this, "SBPOccupancy", {
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("resources"),
            handler: "handler.main",
            environment: {
                OCCUPANCY_TABLE_NAME,
            },
            logRetention: RetentionDays.ONE_WEEK,
        })

        occupancyFunction.addFunctionUrl({
            authType: "NONE",
            cors: {
                allowedOrigins: ["*"],
            },
        })
        occupancyTable.grantReadWriteData(occupancyFunction)

        const eventRule = new events.Rule(this, "SBPOccupancySQSTrigger", {
            schedule: events.Schedule.rate(Duration.minutes(5)),
        })
        eventRule.addTarget(new targets.LambdaFunction(occupancyFunction))
    }
}

module.exports = { SBPOccupancyStack, ACCOUNT_SETTINGS }
