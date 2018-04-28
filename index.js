const _  =  require("underscore")
const fs = require('fs')
const admin = require('firebase-admin')
const serviceAccount = require ('./serviceKey.json')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://el-dorado-app.firebaseio.com"
});
const db = admin.firestore()

// To understand this code better go to the bottom of the code first. :) 

//-----
// Flight Data Procesing Functions.
//-----

// This function build the Flight Id according to OAG format
function getFlightId(airlineCode,flightNumber,departureAirport,date,scheduledTime) {
    return `${airlineCode}${flightNumber}:${departureAirport}:${date}:${scheduledTime}`
}
// This helper function parse the flight status in the two languages (ES and EN)
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

// This helper function parse the Operating Flight Object.
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

// UTC helper function 
function getUTC(flightDate,flightTime,resType) {
    const date = new Date(flightDate+"T"+flightTime+"-05:00")
    if (resType === "date") {
        return date.toISOString().substring(0, 10);
    }
    if (resType === "time") {
        let time =  new Date(date.toISOString()).getTime()
        return convertMs(time) 
    }

}

// Function that Convert Milleseconds to HH:MM:SS
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
    t = `${h}:${m}`
    return t
};



// This  function take an arrival or departure flight
// and parse its corresponding arrival or departure object.
// This is probably the most complex function so please let 
// me know if you have any question. 

function parseFlightType(flight,type,origin,destination) {  

    if (origin==="BOG" && type=="D"){
       
        if (flight.estimated_time && flight.schedule_time) {
            let data = {
                "airport_code": origin,
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
        else {
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
                    }
                }
            }
            return data
        } 

    } else if (origin==="BOG" && type=="A") {
        let data = {
            "airport_code": destination,
            "terminal": " ",
            "gate": " ",
            "baggage": " ",
            "original_alternate": " ",
            "schedule_status": " ",
            "delay_reason": " ",
            "date_time_info": {}
        }
        return data
    } else if (origin !== "BOG" && type=="D") {
        let data = {
            "airport_code": origin,
            "terminal": " ",
            "gate": " ",
            "baggage": " ",
            "original_alternate": " ",
            "schedule_status": " ",
            "delay_reason": " ",
            "date_time_info": {}
        } 
        return data
    } else if (origin !== "BOG" && type=="A") {
        if (flight.estimated_time && flight.schedule_time) {
            let data = {
                "airport_code": destination,
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
        else {
            let data = {
                "airport_code": destination,
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
                    }
                }
            }
            return data
        } 
    }
}



// This helper function evaluate the departure status based on the estimated
// vs scheduled information.

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

// Same as above but for arrivals

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


// This function parse a Departure  with the adocument with the available information. 
// It takes as an input the flight object comming from El Dorado and the Document 
// Format object present in the flight-data-document.json file.

function parseDepartureDocument (flight,fD){
  
    if (flight && fD) {
        fD.id = getFlightId(flight.airline_code,flight.flight_number,"BOG",flight.schedule_date,flight.schedule_time)
        fD.type = "Departure",
        fD.status = parseStatus(flight["status-en"],flight["status-es"])
        fD.destination_type = flight.flight_type
        fD.departure = parseFlightType(flight,"D","BOG",flight.airport)
        fD.arrival = parseFlightType(flight,"A","BOG",flight.airport)
        return fD
    }   
    else {
        return false
    }

}

// This function parse a Arrival  with the adocument with the available information. 
// It takes as an input the flight object comming from El Dorado and the Document 
// Format object present in the flight-data-document.json file.

function parseArrivalDocument (flight,fD){
    if (flight && fD) {
        fD.id = getFlightId(flight.airline_code,flight.flight_number,flight.airport,flight.schedule_date,flight.schedule_time)
        fD.type = "Arrival",
        fD.status = parseStatus(flight["status-en"],flight["status-es"])
        fD.destination_type = flight.flight_type
        fD.departure = parseFlightType(flight,"D",flight.airport,"BOG")
        fD.arrival = parseFlightType(flight,"A",flight.airport,"BOG") 
        return fD
    }   
    else {
        return false
    }

}


//----------
// Main
//----------

// 1. Read the Flight Data comming from el dorado and an Empty json with the Flight Document
// structure according to the data arquitecture document. 
// 2. Procecess the arrivals
// 3. Process the Departures



try {
    const flightData = JSON.parse(fs.readFileSync('./flight-data.json','utf8'))
    const flightDocument = JSON.parse(fs.readFileSync('./flight-data-document.json','utf8'))

    if (flightData && flightDocument) {
        // arrivals procesing
        _.each(flightData.arrivals, function(flight, key){
            let docu = parseArrivalDocument(flight,flightDocument)
            let docRef = db.collection('flights')
            docRef
            .doc(docu.id)
            .set(docu).then((data)=> {
            console.log("ARRIVAL__",data)
            })
        })
        // departures processing
        _.each(flightData.departures, function(flight, key){
            let docu = parseDepartureDocument(flight,flightDocument)
            let docRef = db.collection('flights')
            docRef
            .doc(docu.id)
            .set(docu).then((data)=> {
            console.log("DEPARTURE______",data)
            })
        })
    }
} catch (error) {
    throw new Error(error);
}


