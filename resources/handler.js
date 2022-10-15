const https = require("https")

const LOCATION_MAPPING = {
  FRE: "Fremont",
  UPW: "Fremont (Upper Wall)",
  POP: "Poplar"
}

exports.main = async function (event, context) {
  console.log(`Lambda Function Invoked: ${JSON.stringify(event)}`)
  const options = {
      hostname: "portal.rockgympro.com",
      port: 443,
      path: "/portal/public/314b60a77a6eada788f8cd7046931fc5/occupancy",
      method: "GET",
  }
  const result = await httpGet(options)
  const jsonString = result.split("var data =")[1].split(";")[0].replace(/\s/g, "").replace(/'/g, '"').replace("},}", "}}")
  const json = JSON.parse(`${jsonString}`)
    
  return {
    statusCode: 200,
    headers: {
       "Content-Type": "text/html",
    },
    body: buildHTML(json)
  }
}

const buildHTML = (json) => `
  <style>
    table {
      border-collapse: collapse;
      width: 1000px;
    }

    th, td {
      text-align: left;
      padding: 8px;
      font-size: 50px;
    }

    tr:nth-child(even) {
      background-color: #f2f2f2;
    }

    .title {
      font-size: 50px;
      font-weight: bold;
      text-decoration: underline;
    }
  </style>

  <div style="overflow-x: auto;">
    <div class="title">SBP Occupancy</div>
    <table>
      ${Object.keys(LOCATION_MAPPING).map(key => buildTableRow(key, json)).join("")}
    </table>
  </div>
`

const buildTableRow = (key, json) => `
  <tr>
    <td>${LOCATION_MAPPING[key]}<td>
    <td>${json[key].count}/${json[key].capacity}<td>
  </tr>
`

const httpGet = (options) => new Promise((resolve, reject) => {
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
