# LTA Bus Services API Proxy

- Using firebase functions to act as a proxy for LTADataMall API.
- LTADataMall API returns too much data that can be handled by embedded devices.

# firebase
Change to **firebase/functions** directory

`npm run build:pre`
- The script will generate bus stops database in form of json, to be uploaded to firebase with the functions.
- Only need to run once, or when you lta database changes.
- Also can be used as test for ltadatamall.ts

`npm run build`
- Run this to make sure code are buildable and linted. 
- Base for other run scripts.

`npm run serve-functions`
- Run this to test locally.

`npm run deploy`
- Run this to deploy the functions.