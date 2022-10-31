# SBP Occupancy Checker

A small AWS service that tracks the occupancy for [Seattle Boulder Project](https://seattleboulderingproject.com/) locations.

One aspect of the service is pulling the current occupancy from [their website](https://seattleboulderingproject.com/occupancy) and displaying this information in a table view. The other is a history table that records past occupancy statistics and displays the occupancy from the last hour and from the next hour one week ago to help one extrapolate how the future occupancy might look.

I personally pair this with [MenubarX](https://menubarx.app/) on my computer for quick, at-a-glance information to help determine when to go climbing.

## Usage
- Access the lambda URL at https://qekr6k3edexv5jx66wap6cx3wu0nwqkx.lambda-url.us-west-2.on.aws/. 
- By default, HTML will be returned. This HTML can be specialized with the following query string parameters:
    - `width`: A number that will be used as the pixel width for the HTML response.
    - `fontSize`: A number that will be used as the pixel font size for the HTML response.
- For a JSON response, set `type=json` in the query string
