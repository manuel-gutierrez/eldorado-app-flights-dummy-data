const _  =  require("underscore")
const fs = require('fs')

// Read JSON File
function readJsonFile(path) 
{
 return fs.readFileSync(require.resolve(path))
  }


// Get the flight Id
function getFlightId(airlineCode,flightNumber,departureAirport,date,scheduledTime) {
    return `${airlineCode}${flightNumber}:${departureAirport}${date}${scheduledTime}`
}
// parse flight status
function parseStatus(statusEN,statusES) {
    return (
    {
        "en_EN": {
            "primary_status": statusEN, 
            "secondary_satus": " ", 
            "schedule_status": " "
        },
        "es_ES" : {
            "primary_status": statusES, 
            "secondary_satus": " ", 
            "schedule_status": " "
        }
    }
    )
}
try {
    const flight_data =  JSON.parse(fs.readFileSync('./single-flight-data.json','utf8'))
    if (flight_data != false) {
        console.log("Flight Data", flight_data)
        _.each(flight_data, function(value, key){
            console.log("Value=====", value )
    })
    }
} catch (error) {
    console.error("Error when reading the file")
}


