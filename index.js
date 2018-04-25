const _  =  require("underscore")
const fs = require('fs')
const admin = require('firebase-admin')
const serviceAccount = require ('./serviceKey.json')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://eldorado-app.firebaseio.com"
});

const db = admin.firestore()

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
            "secondary_satus": "Original", 
            "schedule_status": ""
        },
        "es_ES" : {
            "primary_status": statusES, 
            "secondary_satus": "Original", 
            "schedule_status": ""
        }
    }
    )
}

// Operating Flight
function parseOperatingFlight(flight) {
    return ({
        "flight":{
            "flight_number": flight.flight_number,
            "airline_code": flight.airline_code,
            "airline_name": flight.airline,
            "airline_code_type": "IATA",
            "number": flight.flight_number,
            "operating_flight": true,
            "company_logo": flight.airline_logo
        }
    })
}

// UTC helper
function getUTC(flightDate,flightTime,resType) {
    const date = new Date(flightDate+"T"+flightTime)
    if (resType === "date") {
        return date.toISOString();
    }
    if (resType === "time") {
        let time =  new Date(date.toISOString()).getTime()
        return convertMs(time) 
    }

}

 function convertMs(ms) {
    let d, h, m, s, t;
    s = Math.floor(ms / 1000);
    m = Math.floor(s / 60);
    s = s % 60;
    if (s<9) { s = `0${s}`}
    h = Math.floor(m / 60);
    m = m % 60;
    if (m<9) { m = `0${m}`}
    d = Math.floor(h / 24);
    h = h % 24;
    if (h<9) { h = `0${h}`}
    t = `${h}:${m}:${s}`
    return t
  };

// Departure Flight Object 
function parseDeparture(flight) {
    let data = {
        "airport_code": "BOG",
        "terminal": "T1",
        "gate": flight.gate,
        "baggage": flight.claim,
        "original_alternate": "Original",
        "schedule_status": getFlightDepartureStatus(flight),
        "delay_reason": " ",
        "date_time_info": {
            "scheduled": {
                "date": flight.schedule_date,
                "date_utc": getUTC(flight.schedule_date,flight.schedule_time,"date"),
                "time": flight.schedule_time,
                "time_utc": getUTC(flight.schedule_date,flight.schedule_time,"time"),
                "accuracy": "Scheduled",
                "position": "Gateway",
                "source": "Airport Data"
            },
            "estimated": {
                "date": flight.actual_date,
                "date_utc": getUTC(flight.actual_date,flight.estimated_time,"date"),
                "time": flight.estimated_time,
                "time_utc":  getUTC(flight.actual_date,flight.estimated_time,"time"),
                "accuracy": "Estimated",
                "position": "Gateway",
                "source": "Airport Data"
            }
        }
    }

    return data

}

// Arrival Flight Object 
function parseArrival(flight) {
    let data = {
        "airport_code": flight.airport,
        "terminal": "T1",
        "gate": flight.gate,
        "baggage": flight.claim,
        "original_alternate": "Original",
        "schedule_status": getFlightArrivalStatus(flight),
        "delay_reason": " ",
        "date_time_info": {
            "scheduled": {
                "date": flight.schedule_date,
                "date_utc": getUTC(flight.schedule_date,flight.schedule_time,"date"),
                "time": flight.schedule_time,
                "time_utc":  getUTC(flight.schedule_date,flight.schedule_time,"time"),
                "accuracy": "Scheduled",
                "position": "Gateway",
                "source": "Airport Data"
            },
            "estimated": {
                "date": flight.actual_date,
                "date_utc": getUTC(flight.actual_date,flight.schedule_time,"date"),
                "time": flight.estimated_time,
                "time_utc": getUTC(flight.actual_date,flight.schedule_time,"time"),
                "accuracy": "Estimated",
                "position": "Gateway",
                "source": "Airport Data"
            }
        }
    }

    return data

}

function getFlightDepartureStatus(flight) {
    if (flight){
        const scheduled = new Date(flight.schedule_date+"T"+flight.schedule_time+"Z")
        const estimated = new Date(flight.schedule_date+"T"+flight.estimated_time+"Z")
        if (estimated.getTime() === scheduled.getTime()) {
            return "DO"
        } else if ( scheduled.getTime() < estimated.getTime()) {
            return "DD"
        }else if (scheduled.getTime() > estimated.getTime()) {
            return "DE"
        }
    }
    return "Error Flight data not provived"
}

function getFlightArrivalStatus(flight) {
    if (flight){
        const scheduled = new Date(flight.schedule_date+"T"+flight.schedule_time+"Z")
        const estimated = new Date(flight.schedule_date+"T"+flight.estimated_time+"Z")
        if (estimated.getTime() === scheduled.getTime()) {
            return "AO"
        } else if ( scheduled.getTime() < estimated.getTime()) {
            return "AD"
        }else if (scheduled.getTime() > estimated.getTime()) {
            return "AE"
        }
    }
    return "Error Flight data not provived"
}

function parseDepartureDocument (flight,fD){
    if (flight && fD) {
        fD.id = getFlightId(flight.airline_code,flight.flight_number,"BOG",flight.schedule_date,flight.schedule_time)
        fD.type = "Departure",
        fD.status = parseStatus(flight["status-en"],flight["status-es"])
        fD.destination_type = flight.flight_type
        fD.departure = parseDeparture(flight)
        fD.arrival = parseArrival(flight) 
        return fD
    }   
    else {
        return false
    }

}


try {
    const flightData = JSON.parse(fs.readFileSync('./single-flight-data.json','utf8'))
    const flightDocument = JSON.parse(fs.readFileSync('./flight-data-document.json','utf8'))

    if (flightData && flightDocument) {
        _.each(flightData, function(f, key){
            let doc = parseDepartureDocument(f,flightDocument)
            console.log(JSON.stringify(doc));
        })

    // let docRef = db.collection('flights')
    // _.each(flightData, function(value, key){
    //     docRef
    //     .doc(value.id)
    //     .set(value).then(()=> {
    //      console.log('New flight entry created')
    //     })
    // })
    }
} catch (error) {
    console.error("Error when reading the file", error)
}


