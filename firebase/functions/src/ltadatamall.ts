import * as rm from "typed-rest-client";
import * as fs from "fs";

export interface BusStop {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Latitude: number;
  Longitude: number;
}

interface BusStopResult {
  value: BusStop[];
}

interface BusService {
  ServiceNo: string;
  NextBus: {EstimatedArrival: string};
  NextBus2: {EstimatedArrival: string};
  NextBus3: {EstimatedArrival: string};
}

interface BusService2 {
  ServiceNo: string;
  Arrivals: [ string, string, string ];
}

export interface BusServicesResult {
  BusStopCode: string;
  Services: BusService[];
}

export interface BusServicesResult2 {
  BusStopCode: string;
  Services: BusService2[];
}

let APIKey: string = process.env.LTADATAMALL_KEY;
export function setAPIKey(key: string): void {
  APIKey = key;
}

const MaxRecord = 500;

function deg2Rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function pythagorasEquirectangular(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const _lat1 = deg2Rad(lat1);
  const _lat2 = deg2Rad(lat2);
  const _lon1 = deg2Rad(lon1);
  const _lon2 = deg2Rad(lon2);
  const R = 6371; // km
  const x = (_lon2 - _lon1) * Math.cos((_lat1 + _lat2) / 2);
  const y = _lat2 - _lat1;
  const d = Math.sqrt(x * x + y * y) * R;
  return d;
}

/**
 * Search for n nearest bus stops to [lat,lon].
 * @param {number} lat Coordiate
 * @param {number} lon Coordinate
 * @param {number} num Number of bus stops nearby.
 * @param {any} busStops (Optional) If null, the function will fetch all list
 * @return {any} Nearest n bus stops.
 */
export async function findNearestBusStops(
  lat: number,
  lon: number,
  num: number,
  busStops: BusStop[]
): Promise <BusStop[]> {
  let allBusStops: BusStop[] = busStops;
  if (allBusStops==null) {
    allBusStops = await getAllBusStops();
  }
  allBusStops.sort((a: BusStop, b: BusStop) => {
    const distA = pythagorasEquirectangular(a.Latitude, a.Longitude, lat, lon);
    const distB = pythagorasEquirectangular(b.Latitude, b.Longitude, lat, lon);
    return distA - distB;
  });
  return allBusStops.slice(0, num);
}

export async function getBusArrivals(busStopCode: string): Promise<BusServicesResult> {
  if (APIKey == "") {
    console.log("Remember to set APIKey!");
    return null;
  }

  const _options: rm.IRequestOptions = <rm.IRequestOptions> {};
  _options.additionalHeaders = {
    AccountKey: APIKey,
  };

  _options.queryParameters = {
    params: {
      BusStopCode: busStopCode,
    },
  };
  const restclient: rm.RestClient = new rm.RestClient(
    "ltadatamall",
    "http://datamall2.mytransport.sg"
  );
  const busArrivalsRes: rm.IRestResponse<BusServicesResult> =
   await restclient.get<BusServicesResult>("/ltaodataservice/BusArrivalv2", _options);
  const busArrivals: BusServicesResult = {} as BusServicesResult;
  // busArrivals.BusStopCode = busArrivalsRes.result.BusStopCode;
  // busArrivals.Services = busArrivalsRes.result.Services;
  busArrivals.BusStopCode = busArrivalsRes.result.BusStopCode;
  /* eslint-disable */
  busArrivals.Services = busArrivalsRes.result.Services.map(
    ({ServiceNo, NextBus, NextBus2, NextBus3})=>(
    { 
      ServiceNo: ServiceNo,  
      NextBus: {EstimatedArrival: NextBus.EstimatedArrival},
      NextBus2: {EstimatedArrival: NextBus2.EstimatedArrival},
      NextBus3: {EstimatedArrival: NextBus3.EstimatedArrival}
    }));
  /* eslint-enable */
  return busArrivals;
}

export async function getBusArrivalsv2(busStopCode: string): Promise<BusServicesResult2> {
  if (APIKey == "") {
    console.log("Remember to set APIKey!");
    return null;
  }

  const _options: rm.IRequestOptions = <rm.IRequestOptions> {};
  _options.additionalHeaders = {
    AccountKey: APIKey,
  };

  _options.queryParameters = {
    params: {
      BusStopCode: busStopCode,
    },
  };
  const restclient: rm.RestClient = new rm.RestClient(
    "ltadatamall",
    "http://datamall2.mytransport.sg"
  );
  const busArrivalsRes: rm.IRestResponse<BusServicesResult> =
   await restclient.get<BusServicesResult>("/ltaodataservice/BusArrivalv2", _options);
  const busArrivals: BusServicesResult2 = {} as BusServicesResult2;
  busArrivals.BusStopCode = busArrivalsRes.result.BusStopCode;
  /* eslint-disable */
  busArrivals.Services = busArrivalsRes.result.Services.map(
    ({ServiceNo, NextBus, NextBus2, NextBus3})=>(
    { 
      ServiceNo: ServiceNo,  
      Arrivals: [ 
        NextBus.EstimatedArrival,
        NextBus2.EstimatedArrival,
        NextBus3.EstimatedArrival
      ],
    }));
  /* eslint-enable */
  return busArrivals;
}

export async function getBusServices(busStopCode: string): Promise<string[]> {
  let allBusServices: string[] = [];
  if (APIKey == "") {
    console.log("Remember to set APIKey!");
    return allBusServices;
  }

  const _options: rm.IRequestOptions = <rm.IRequestOptions> {};
  _options.additionalHeaders = {
    AccountKey: APIKey,
  };

  _options.queryParameters = {
    params: {
      BusStopCode: busStopCode,
    },
  };
  const restclient: rm.RestClient = new rm.RestClient(
    "ltadatamall",
    "http://datamall2.mytransport.sg"
  );
  const busServices: rm.IRestResponse<BusServicesResult> =
   await restclient.get<BusServicesResult>(
    "/ltaodataservice/BusArrivalv2",
    _options);
  allBusServices = busServices.result.Services.map(({ServiceNo})=>ServiceNo);
  return allBusServices;
}

export async function getAllBusStops(): Promise <BusStop[]> {
  let allBusStops: BusStop[] = [];
  if (APIKey == "") {
    console.log("Remember to set APIKey!");
    return allBusStops;
  }

  const _options: rm.IRequestOptions = <rm.IRequestOptions> {};
  _options.additionalHeaders = {
    AccountKey: APIKey,
  };
  const restclient: rm.RestClient = new rm.RestClient(
    "ltadatamall",
    "http://datamall2.mytransport.sg"
  );

  let skip = 0;
  let busstops: rm.IRestResponse<BusStopResult>;
  do {
    _options.queryParameters = {
      params: {
        $skip: skip,
      },
    };
    busstops = await restclient.get<BusStopResult>(
      "/ltaodataservice/BusStops",
      _options
    );
    allBusStops = busstops.result.value.concat(allBusStops);
    skip = skip + MaxRecord;
  } while (busstops.result.value.length>0);
  allBusStops = busstops.result.value.concat(allBusStops);
  return allBusStops;
}

export async function main() {
  console.log("ltadatamall.main()");
  if (process.env.LTADATAMALL_KEY===undefined) {
    console.log("Please set LTADATAMALL_KEY environment variable!");
    return;
  }

  const allBusStops: Array<BusStop> = await getAllBusStops();
  // eslint-disable-next-line
  console.log(`allBusStops.length: ${allBusStops.length}`);
  fs.writeFileSync("./busstops.json", JSON.stringify(allBusStops, null, 2), "utf-8");

  // const nearestBusStops = await findNearestBusStops(1.265588, 103.822327, 1, null);
  // console.log(nearestBusStops);

  // const busServices = await getBusServices("03059");
  // console.log(busServices);

  const busArrivals = await getBusArrivals("14141");
  console.log(busArrivals);

  const busArrivals2 = await getBusArrivalsv2("14141");
  console.log(busArrivals2);
}
