from os import system
import argparse
import os.path
import requests
import json
import math
import time
import urllib.parse
from googleapiclient.discovery import build
from googlesearch import search
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

# The ID and range of a sample spreadsheet.
RANGE_TEMPLATE = "{tab}!A2:J"

ADDR_RESOLUTION_TEMPLATE = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?fields=formatted_address%2Cname%2Cgeometry&input={raw_addr}&inputtype=textquery&key={maps_api_key}"


def loadCreds():
    sheets_creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists("../credentials/token.json"):
        sheets_creds = Credentials.from_authorized_user_file("../credentials/token.json", SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not sheets_creds or not sheets_creds.valid:
        if sheets_creds and sheets_creds.expired and sheets_creds.refresh_token:
            sheets_creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("../credentials/credentials.json", SCOPES)
            sheets_creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open("../credentials/token.json", "w") as token:
            token.write(sheets_creds.to_json())

    maps_api_key = None
    if os.path.exists("../credentials/maps_key.json"):
        key_file = open("../credentials/maps_key.json")
        maps_api_key = json.load(key_file)["key"]
    else:
        print("Missing maps_key.json with Google Maps API key")
        quit()

    return sheets_creds, maps_api_key


def loadSheets(sheets_creds, sheet_id):
    service = build("sheets", "v4", credentials=sheets_creds)

    # Call the Sheets API
    sheet = service.spreadsheets()

    # Get Sheet metadata
    metadata = sheet.get(spreadsheetId=sheet_id).execute()
    tabs = []
    for sheet in metadata.get("sheets", []):
        tabs.append(sheet["properties"]["title"])

    # Get Sheet content
    result = []
    for tab in tabs:
        print("Loading {tab}".format(tab=tab))
        sheet = service.spreadsheets()
        contents = (
            sheet.values()
            .get(
                spreadsheetId=sheet_id,
                range=RANGE_TEMPLATE.format(tab=tab),
            )
            .execute()
        )
        rows = contents.get("values", [])
        result = result + rows

    print(
        "Finished loading {num_rows} rows from sheet {sheet_id}".format(
            num_rows=len(result), sheet_id=sheet_id
        )
    )
    return result


def toHouseEntries(values, maps_api_key):
    if not values:
        print("No data found.")
    else:
        result = []
        for row in values:
            raw_addr = ""
            if len(row) != 9 and len(row) != 10:
                continue
            elif len(row) == 9:
                raw_addr = " ".join([row[1], row[2], row[3], row[4]])
                rowDict = {
                    "mls_id": row[0],
                    "bed_baths": row[5],
                    "sqft": row[6],
                    "year_built": row[7],
                    "price": row[8],
                    "type": "SFR",
                }
            elif len(row) == 10:
                raw_addr = " ".join([row[2], row[3], row[4], row[5]])
                rowDict = {
                    "mls_id": row[0],
                    "bed_baths": row[6],
                    "sqft": row[7],
                    "year_built": row[8],
                    "price": row[9],
                    "type": row[1],
                }

            resolvedGeoData = getGeoData(raw_addr, maps_api_key, attempt=1)
            link = getFirstSearchResult(rowDict["mls_id"], attempt=1)
            if len(resolvedGeoData) == 0 or link is None:
                continue

            rowDict["addr"] = resolvedGeoData["formatted_addr"]
            rowDict["coordinates"] = resolvedGeoData["coordinates"]
            rowDict["link"] = link

            result.append(rowDict)

    return result


def getGeoData(raw_addr, maps_api_key, attempt):
    url = ADDR_RESOLUTION_TEMPLATE.format(
        raw_addr=urllib.parse.quote(raw_addr), maps_api_key=maps_api_key
    )
    resp = requests.get(url=url)

    if resp.status_code != 200 or resp.json()["status"] == "OVER_QUERY_LIMIT":
        backoff_time = math.pow(2, attempt)
        if resp.status_code == 200:
            print(resp.json())
        print(
            "Retrying fetching {raw_addr} in {wait} seconds".format(
                raw_addr=raw_addr, wait=backoff_time
            )
        )
        time.sleep(backoff_time)
        return getGeoData(raw_addr, maps_api_key, attempt + 1)
    elif len(resp.json()["candidates"]) == 0:
        print(
            "Found no matches for {raw_addr}: {resp}".format(
                raw_addr=raw_addr, resp=resp.json()
            )
        )
        return {}
    else:
        info = resp.json()["candidates"][0]
        print(
            "Fetched {raw_addr} in attempt {attempt_num}".format(
                raw_addr=raw_addr, attempt_num=attempt
            )
        )
        return {
            "formatted_addr": info["formatted_address"],
            "coordinates": info["geometry"]["location"],
        }


def getFirstSearchResult(mls_id, attempt):
    res = next(
        search("MLS {mls_id}".format(mls_id=mls_id), num=1, stop=1, pause=2), None
    )
    if res is None:
        if attempt == 3:
            print("Found no links for {mls_id}".format(mls_id=mls_id))
            return None
        backoff_time = math.pow(2, attempt)
        print(
            "Retrying fetching link for {mls_id} in {wait} seconds".format(
                mls_id=mls_id, wait=backoff_time
            )
        )
        return getFirstSearchResult(mls_id, attempt + 1)
    print(
        "Fetched link for {mls_id} in attempt {attempt_num}".format(
            mls_id=mls_id, attempt_num=attempt
        )
    )
    return res


def main():

    parser = argparse.ArgumentParser()
    parser.add_argument("-sid", "--sheet_id", help="Sheet ID")
    parser.add_argument(
        "-disk",
        "--write_to_disk",
        default=False,
        required=False,
        help="Whether or not to write imported results to disk",
        type=bool,
    )
    args = parser.parse_args()

    sheets_creds, maps_api_key = loadCreds()
    raw_sheet_rows = loadSheets(sheets_creds, args.sheet_id)
    output_rows = toHouseEntries(raw_sheet_rows, maps_api_key)

    if args.write_to_disk is True:
        with open("houses.json", "w") as output_file:
            json.dump(output_rows, output_file, indent=4)

    print("Finished importing housing data")
    exit()


if __name__ == "__main__":
    main()
