import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as lta from "./ltadatamall";
import * as allBusStops from "./busstops.json";

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

export const listBusStops = functions
  .https.onRequest((request, response) => {
    db.listCollections().then(async (collections) => {
      for (const collection of collections) {
        console.log(`Found collection with id: ${collection.id}`);
        const docs = await collection.listDocuments();
        for (const doc of docs) {
          // console.log(doc.id, "=>", (await doc.get()).data());
        }
      }
      console.log("Found db");
      response.send("Found db");
    });
  });

export const deleteBusStops = functions
  .https.onRequest((request, response)=>{
    console.log("all busStops:");
    console.log(allBusStops.length);
    response.send("Delete successful.");
  });

export const initBusStops = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .https.onRequest((request, response) => {
    const ltaDatamallKey = request.get("AccountKey");
    const allBusStops = lta.getAllBusStops(ltaDatamallKey);
    allBusStops.then( async (busStops)=>{
      // eslint-disable-next-line
      console.log(`${busStops.length} bus stops found.`);
      // TODO: Clean everything first
      let count = 0;
      for (let i=0, len=busStops.length; i<len; i++) {
        const busStop = busStops[i];
        if (busStop.BusStopCode != null && busStop.BusStopCode.length > 0) {
          const busStopDoc = db.collection("BusStops").doc(busStop.BusStopCode);
          await busStopDoc.set(busStop);
          count++;
          if (count%1000===0) {
            // eslint-disable-next-line
            console.log(`${count} stored.`);
          }
        }
      }
      // eslint-disable-next-line
      console.log( `${count} stored.`);
      response.send("Successful. " + busStops.length + " bus stops found. " + count + " recorded.");
  });
});

const busStopList: lta.BusStop[] = [];

async function getAllBusStops(): Promise<lta.BusStop[]> {
  return new Promise<lta.BusStop[]>( (resolve)=>{
    // eslint-disable-next-line
    console.log(`busStopList.length: ${busStopList.length}`);
    if (busStopList.length===0) {
      console.log("Fetching from store.");
      db.listCollections().then(async (collections) => {
        for (const collection of collections) {
          const docs = await collection.listDocuments();
          for (const doc of docs ) {
            busStopList.push((await doc.get()).data() as lta.BusStop);
          }
        }
        console.log("(Store)Bus stops count: " + busStopList.length);
        resolve(busStopList);
      });
    } else {
      console.log("(Cache)Bus stops count: " + busStopList.length);
      resolve(busStopList);
    }
  });
}

/*
API to return all bus stops.
*/
export const busStops = functions
.runWith({
  timeoutSeconds: 300,
})
.https.onRequest( async (request, response) => {
  let useStore = false; // Use realtime by default
  if (request.query.usestore != null) {
    useStore = request.query.usestore==="true" || request.query.usestore==="1";
  }
  console.log("usestore=" + useStore);

  let num = 5; // Default
  if (request.query.num != null) {
    num = Number(request.query.num as string);
  }

  if (request.query.loc != null) {
    // Center of Singapore
    let lat = 1.3521;
    let lon = 103.8198;
    const loc: string = request.query.loc as string;
    const locs = loc.split(",", 2);
    if (locs.length >= 2) {
      lat = Number(locs[0]);
      lon = Number(locs[1]);
    }
    // console.log("lat: " + lat);
    // console.log("lon: " + lon);
    const ltaDatamallKey = request.get("AccountKey");
    // const nearestBusStops = lta.findNearestBusStops(lat, lon, num, useStore?(await getAllBusStops()):null);
    const nearestBusStops = lta.findNearestBusStops(ltaDatamallKey, lat, lon, num, allBusStops);
    nearestBusStops.then((busStops) => {
      response.type("application/json");
      response.send(JSON.stringify(busStops));
    })
    .catch((err)=>{
      response.statusCode = 400;
      response.type("application/text");
      response.send(err.message);
    });
  } else {
    response.type("application/json");
    response.send(JSON.stringify({}));
  }
});

/*
Returns bus services avalaible for a bus stop.
Query parameters:
  BusStopCode
*/
export const busServices = functions.https.onRequest((request, response) => {
  let services: Promise<string[]>;
  if (request.query.BusStopCode != null) {
    const ltaDatamallKey = request.get("AccountKey");
    services = lta.getBusServices(ltaDatamallKey, request.query.BusStopCode as string);
    services.then((_services)=>{
      response.type("application/json");
      response.send(JSON.stringify(_services));
    })
    .catch((err)=>{
      response.statusCode = 400;
      response.type("application/text");
      response.send(err.message);
    });
  } else {
    response.type("application/json");
    response.send(JSON.stringify({}));
  }
});

/*
Returns bus services arrival time for a bus stop.
Query parameters:
  BusStopCode
*/
export const busArrival = functions.https.onRequest((request, response) => {
  let arrivals: Promise<lta.BusServicesResult>;
  if (request.query.BusStopCode != null) {
    const ltaDatamallKey = request.get("AccountKey");
    arrivals = lta.getBusArrivals(ltaDatamallKey, request.query.BusStopCode as string);
    arrivals
    .then((_arrivals)=>{
      if (_arrivals==null) {
        response.statusCode = 500;
        _arrivals = {} as lta.BusServicesResult;
      }
      response.type("application/json");
      response.send(JSON.stringify(_arrivals));
    })
    .catch((err)=>{
      response.statusCode = 400;
      response.type("application/text");
      response.send(err.message);
    });
  } else {
    response.type("application/json");
    response.send(JSON.stringify({}));
  }
});

/*
Returns bus services arrival time for a bus stop, in a simplified format.
Query parameters:
  BusStopCode
*/
export const busArrivalv2 = functions.https.onRequest( (request, response)=>{
  let arrivals: Promise<lta.BusServicesResult2>;
  if (request.query.BusStopCode != null) {
    const ltaDatamallKey = request.get("AccountKey");
    arrivals = lta.getBusArrivalsv2(ltaDatamallKey, request.query.BusStopCode as string);
    arrivals.then((_arrivals)=>{
      response.type("application/json");
      response.send(JSON.stringify(_arrivals));
    })
    .catch((err)=>{
      response.statusCode = 400;
      response.type("application/text");
      response.send(err.message);
    });
  } else {
    response.type("application/json");
    response.send(JSON.stringify({}));
  }
});
