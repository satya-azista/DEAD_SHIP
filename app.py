import geopandas as gpd
from shapely.geometry import Point, Polygon, LineString
import pandas as pd
import fiona
fiona.drvsupport.supported_drivers['libkml'] = 'rw'
import numpy as np
import geopy
from geopy import distance
import datetime
# from datetime import datetime
import time
from math import radians, degrees, cos, sin, asin, sqrt, atan2
from statistics import mean 
from shapely import wkt
import math
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from io import BytesIO
app = Flask(__name__)
CORS(app, origins='*')
req_data=None
@app.route('/process_xml', methods=['POST'])
def process_xml():
    global req_data
    if request.method == 'POST':
        xml_data = request.data
        req_data=xml_data
        req_data=BytesIO(req_data)
        fiona.drvsupport.supported_drivers['LIBKML'] = 'rw'
        with fiona.open(req_data) as collection:
            gdf = gpd.GeoDataFrame.from_features(collection)
        # remove empty Time Stamp data
        gdf = gdf.drop(gdf[gdf.Time_Stamp.isnull()].index)

        # Convert to datetime format
        gdf.Time_Stamp = pd.to_datetime(gdf.Time_Stamp.str.split(',').str[0].str.strip('{') +","+ gdf.Time_Stamp.str.split(',').str[1].str[:15], format='%d-%m-%Y,%H:%M:%S.%f')
        # Convert to Unix time
        gdf.Time_Stamp = (gdf.Time_Stamp - pd.Timestamp("1970-01-01")) // pd.Timedelta('1s')
        # Get mean Value
        r_time = round(gdf.Time_Stamp.mean())
        # Convert Back to date time format
        average_timestamp = pd.to_datetime(r_time, unit='s')
        #change UTM to IST, Differernce is 5:30 hours
        time_change = datetime.timedelta(hours=5,minutes=30)
        AIStime = average_timestamp + time_change
        AIStime_type=str(AIStime)
        # Process the XML data as needed
        # For demonstration, simply echoing the XML data back
        # return req_data, 200, {'Content-Type': 'application/xml'}
        return jsonify({'timestamp_type': AIStime_type})
    else:
        return jsonify({'error': 'Method not allowed'}), 405

if __name__ == '__main__':
    app.run(debug=True)