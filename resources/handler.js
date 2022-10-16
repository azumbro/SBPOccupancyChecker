const aws = require("aws-sdk")
const https = require("https")

const OCCUPANCY_TABLE_NAME = process.env.OCCUPANCY_TABLE_NAME
const DYNAMO = new aws.DynamoDB.DocumentClient()

const LOCATION_MAPPING = {
    FRE: "Fremont",
    UPW: "Fremont (Upper Wall)",
    POP: "Poplar",
}

const FIVE_MINUTES_MILLIS = 5 * 60 * 1000
const ONE_HOUR_MILLIS = FIVE_MINUTES_MILLIS * 12
const ONE_DAY_MILLIS = ONE_HOUR_MILLIS * 24
const ONE_WEEK_MILLIS = ONE_DAY_MILLIS * 7
const ONE_YEAR_SECONDS = (ONE_DAY_MILLIS * 365) / 1000

exports.main = async function (event, context) {
    console.log(`Lambda Function Invoked: ${JSON.stringify(event)}`)

    const scheduleRequest = event.source === "aws.events"
    const occupancyJSON = await getOccupancyJSON()
    const [body, headers] = scheduleRequest ? await handleSQSRequest(occupancyJSON) : await handleHTTPRequest(event, occupancyJSON)

    return {
        statusCode: 200,
        headers,
        body,
    }
}

async function handleHTTPRequest(event, occupancy) {
    const jsonRequest = event.queryStringParameters && event.queryStringParameters.type && event.queryStringParameters.type === "json"
    const width = event.queryStringParameters && event.queryStringParameters.width ? `${event.queryStringParameters.width}px` : "100%"
    const fontSize = event.queryStringParameters && event.queryStringParameters.fontSize ? `${event.queryStringParameters.fontSize}px` : "50px"

    const hourAgoOccupancyItem = await getItem(getNearestFiveMinutesMillis() - ONE_HOUR_MILLIS)
    const hourAgoOccupancy = hourAgoOccupancyItem && JSON.parse(hourAgoOccupancyItem.data)
    const lastWeekOccupancyItem = await getItem(getNearestFiveMinutesMillis() - ONE_WEEK_MILLIS + ONE_HOUR_MILLIS)
    const lastWeekOccupancy = lastWeekOccupancyItem && JSON.parse(lastWeekOccupancyItem.data)

    return [
        jsonRequest ? buildJSON(occupancy, hourAgoOccupancy, lastWeekOccupancy) : buildHTML(occupancy, hourAgoOccupancy, lastWeekOccupancy, width, fontSize),
        { "Content-Type": jsonRequest ? "application/json" : "text/html" },
    ]
}

async function handleSQSRequest(occupancyJSON) {
    const timestamp = getNearestFiveMinutesMillis()
    const data = JSON.stringify(Object.keys(occupancyJSON).reduce((accum, key) => ({ ...accum, [key]: occupancyJSON[key].count }), {}))
    const params = {
        TableName: OCCUPANCY_TABLE_NAME,
        Item: {
            timestamp,
            data,
            ttl: timestamp / 1000 + ONE_YEAR_SECONDS,
        },
    }
    await DYNAMO.put(params).promise()

    return [null, null]
}

async function getItem(timestamp) {
    const params = {
        TableName: OCCUPANCY_TABLE_NAME,
        Key: { timestamp },
    }

    const result = await DYNAMO.get(params).promise()
    return result && result.Item
}

async function getOccupancyJSON() {
    const options = {
        hostname: "portal.rockgympro.com",
        port: 443,
        path: "/portal/public/314b60a77a6eada788f8cd7046931fc5/occupancy",
        method: "GET",
    }
    const result = await httpGet(options)
    const jsonString = result.split("var data =")[1].split(";")[0].replace(/\s/g, "").replace(/'/g, '"').replace("},}", "}}")

    return JSON.parse(`${jsonString}`)
}

const httpGet = (options) =>
    new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseBody = ""
            res.on("data", (d) => {
                responseBody += d
            })

            res.on("end", () => {
                resolve(responseBody)
            })
        })

        req.on("error", (error) => {
            console.error(error)
        })

        req.end()
    })

const buildJSON = (occupancy, hourAgoOccupancy, lastWeekOccupancy) =>
    Object.keys(LOCATION_MAPPING).reduce(
        (accum, key) => ({
            ...accum,
            [LOCATION_MAPPING[key]]: {
                capacity: occupancy[key].capacity,
                occupancyNow: occupancy[key].count,
                occupancyHourAgo: hourAgoOccupancy && hourAgoOccupancy[key] ? hourAgoOccupancy[key] : null,
                occupancy24HoursAgo: lastWeekOccupancy && lastWeekOccupancy[key] ? lastWeekOccupancy[key] : null,
            },
        }),
        {}
    )

const buildHTML = (occupancy, hourAgoOccupancy, lastWeekOccupancy, width, fontSize) => `
   <style>
    table {
      border-collapse: collapse;
      width: ${width};
    }
    th, td {
      text-align: left;
      padding: 8px;
      font-size: ${fontSize};
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    .title {
      font-size: ${fontSize};
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 10px;
    }
  </style>
  
  <div style="overflow-x: auto;">
    <div class="title">SBP Occupancy</div>
    <table>
      <tr>
        <th>Location</th>
        <th>Current</th>
        <th>Hour Ago</th>
        <th>Hour Future Last Week</th>
      </tr>
      ${Object.keys(LOCATION_MAPPING)
          .map((key) => buildTableRow(key, occupancy, hourAgoOccupancy, lastWeekOccupancy))
          .join("")}
    </table>
  </div>
`

const buildTableRow = (key, occupancy, hourAgoOccupancy, lastWeekOccupancy) => `
  <tr>
    <td>${LOCATION_MAPPING[key]}</td>
    <td>${occupancy[key].count}/${occupancy[key].capacity}</td>
    <td>${hourAgoOccupancy ? hourAgoOccupancy[key] : "NA"}</td>
    <td>${lastWeekOccupancy ? lastWeekOccupancy[key] : "NA"}</td>
  </tr>
`
const getNearestFiveMinutesMillis = () => new Date(Math.round(new Date().getTime() / FIVE_MINUTES_MILLIS) * FIVE_MINUTES_MILLIS).getTime()
