import geopandas as gpd
from shapely.geometry import Point, Polygon, LineString
import geopandas as gpd
from shapely.geometry import Point, Polygon, LineString
import pandas as pd
import fiona
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
from flask import Flask, request, jsonify, session,current_app,render_template, request, redirect, url_for,send_file,make_response
from flask_cors import CORS
import io
from io import BytesIO
from io import StringIO
import json
from geopy.distance import distance
import zipfile
import shutil
import os
import xml.etree.ElementTree as ET
import requests
import psycopg2
from PIL import Image
app = Flask(__name__)
CORS(app, origins='*')
# CORS(app, resources={r"/api/*": {"origins": "http://127.0.0.1:5000"}})
@app.route('/get', methods=['POST'])
def get():
    data = request.json
    xml_data = data['xmldata']
    csv_data = data['csvData']
    csv=pd.read_csv(StringIO(csv_data))
    xml_bytes = xml_data.encode()
    req_data=io.BytesIO(xml_bytes)
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
    pairs = csv[csv.duplicated(subset="ID_IMO", keep=False)]
    non_pairs = csv[~csv.duplicated(subset="ID_IMO", keep=False)]
    pairs.TIMESTAMP_SOURCE = pd.to_datetime(pairs.TIMESTAMP_SOURCE, format="%d-%m-%Y %H:%M")
    grp = pairs.groupby("ID_IMO")
    imo = []
    geometry = []
    geometry_line = []
    for i in grp.ID_IMO:
        a, b = grp.get_group(i[0]).index[:2]
        t1 = pairs._get_value(a, "TIMESTAMP_SOURCE")
        t2 = pairs._get_value(b, "TIMESTAMP_SOURCE")
        if t1 < t2:
            lat_start, long_start = pairs._get_value(
                a, "KINEMATIC_POS_LLA_LAT"
            ), pairs._get_value(a, "KINEMATIC_POS_LLA_LON")
            lat_end, long_end = pairs._get_value(
                b, "KINEMATIC_POS_LLA_LAT"
            ), pairs._get_value(b, "KINEMATIC_POS_LLA_LON")
            ratio = (AIStime - t1) / (t2 - t1)

        elif t1 == t2:
            ratio = 0
        else:
            lat_start, long_start = pairs._get_value(
                b, "KINEMATIC_POS_LLA_LAT"
            ), pairs._get_value(b, "KINEMATIC_POS_LLA_LON")
            lat_end, long_end = pairs._get_value(
                a, "KINEMATIC_POS_LLA_LAT"
            ), pairs._get_value(a, "KINEMATIC_POS_LLA_LON")
            ratio = (AIStime - t2) / (t1 - t2)

        d, b = haversine(long_start, lat_start, long_end, lat_end)
        d = d * ratio

        new = new_pt(lat_start, long_start, d, b)
        imo.append(i[0])
        geometry.append(Point(new.longitude, new.latitude))
        geometry_line.append(LineString([(long_start, lat_start), (long_end, lat_end)]))
        # int_points.append(new_pt)

    int_points_pair = gpd.GeoDataFrame(columns=["IMO", "geometry"], crs="EPSG:4326")
    int_points_pair.geometry = geometry
    int_points_pair.IMO = imo

    pair_line = gpd.GeoDataFrame(columns=["IMO", "geometry"], crs="EPSG:4326")
    pair_line.geometry = geometry_line
    pair_line.IMO = imo


    non_pairs = non_pairs.dropna(
        subset=[
            "ID_IMO",
            "KINEMATIC_POS_LLA_LAT",
            "KINEMATIC_POS_LLA_LON",
            "KINEMATIC_SPEED",
            "KINEMATIC_HEADING_TRUE",
        ]
    )

    non_pairs.TIMESTAMP_SOURCE = pd.to_datetime(non_pairs.TIMESTAMP_SOURCE, format="%d-%m-%Y %H:%M")
    geometry = []
    line_geometry = []
    imo = []
    for i in non_pairs.ID_IMO:
        index = non_pairs[non_pairs["ID_IMO"] == i].index[0]
        t = non_pairs._get_value(index, "TIMESTAMP_SOURCE")

        if t < AIStime:
            delta_time = AIStime - t
            delta_time = delta_time.total_seconds() / 3600
            lat_start = non_pairs._get_value(index, "KINEMATIC_POS_LLA_LAT")
            long_start = non_pairs._get_value(index, "KINEMATIC_POS_LLA_LON")
            heading = non_pairs._get_value(index, "KINEMATIC_HEADING_TRUE")

        else:
            delta_time = t - AIStime
            delta_time = delta_time.total_seconds() / 3600
            lat_start = non_pairs._get_value(index, "KINEMATIC_POS_LLA_LON")
            long_start = non_pairs._get_value(index, "KINEMATIC_POS_LLA_LAT")
            heading = abs(non_pairs._get_value(index, "KINEMATIC_HEADING_TRUE") - 180)

        heading = non_pairs._get_value(index, "KINEMATIC_HEADING_TRUE")
        speed_km = non_pairs._get_value(index, "KINEMATIC_SPEED") * 1.852
        distance = delta_time * speed_km

        int_pt = new_pt(lat_start, long_start, distance, heading)
        geometry.append(Point(int_pt.longitude, int_pt.latitude))
        line_geometry.append(
            LineString([(long_start, lat_start), (int_pt.longitude, int_pt.latitude)])
        )
        imo.append(i)

    int_points_single = gpd.GeoDataFrame(columns=["IMO", "geometry"], crs="EPSG:4326")
    int_points_single.geometry = geometry
    int_points_single.IMO = imo

    single_line = gpd.GeoDataFrame(columns=["IMO", "geometry"], crs="EPSG:4326")
    single_line.geometry = line_geometry
    single_line.IMO = imo
    point=pd.concat([int_points_pair,int_points_single])
    line=pd.concat([pair_line,single_line])
    deg = meters_to_degrees(5000,13.5)
    buffer_points = [int_points_pair,int_points_single]
    buffer_imo = []
    buffer_geom = []
    buffer_dict={}
    for points in buffer_points:
        for i in range(len(points.index)):
            buffer_imo.append(int(points.IMO[i]))
            points.geometry[i]
            buffer_dict[points.geometry[i].buffer(deg)]=points.geometry[i]
            buffer_geom.append(points.geometry[i].buffer(deg))
    
    buffer = gpd.GeoDataFrame(columns= ['IMO','geometry'],crs='EPSG:4326')
    buffer.geometry = buffer_geom
    buffer.IMO = buffer_imo
    output_folder = current_app.root_path+'/my-app'
    os.makedirs(output_folder, exist_ok=True)
    folder_name_point = "point"
    folder_name_buffer = "Buffer"
    folder_name_line="line"
    # Combine the parent directory path and the folder name
    folder_path_line= os.path.join(output_folder, folder_name_line)
    folder_path_point= os.path.join(output_folder, folder_name_point)
    folder_path_buffer= os.path.join(output_folder, folder_name_buffer)
    # Create the folder if it doesn't exist
    if not os.path.exists(folder_path_line):
        os.makedirs(folder_path_line)
    if not os.path.exists(folder_path_point):
        os.makedirs(folder_path_point)
    if not os.path.exists(folder_path_buffer):
        os.makedirs(folder_path_buffer)
    line_out = folder_path_line + "\\" + "line.shp"
    point_out = folder_path_point + "\\" + "int_point.shp"
    buffer_poly_out = folder_path_buffer + "\\" + "buffer_poly.shp"
    point.to_file(point_out, driver="ESRI Shapefile")
    line.to_file(line_out, driver="ESRI Shapefile")
    buffer.to_file(buffer_poly_out,driver="ESRI Shapefile")
    for root, dirs, files in os.walk(folder_path_point):
        for file in files:
            if file.endswith(".shp"):
                # Found a shapefile
                shapefile_path_point = os.path.join(root, file)
                gdf_point=gpd.read_file(shapefile_path_point)
                json_point=gdf_point.to_json()
    for root, dirs, files in os.walk(folder_path_line):
        for file in files:
            if file.endswith(".shp"):
                # Found a shapefile
                shapefile_path_line = os.path.join(root, file)
                gdf_line=gpd.read_file(shapefile_path_line)
                json_line=gdf_line.to_json()
    for root, dirs, files in os.walk(folder_path_buffer):
        for file in files:
            if file.endswith(".shp"):
                # Found a shapefile
                shapefile_path_buffer = os.path.join(root, file)
                gdf_buffer=gpd.read_file(shapefile_path_buffer)
                json_buffer=gdf_buffer.to_json()
    json_ship_point=gdf['geometry'].to_json()
    ship_list=[]
    total_ship_list=[]
    for cord in gdf['geometry']:
        # check=Point(cord.x,cord.y)
        total_ship_list.append(cord)
    for row in buffer.itertuples(index=False):
        polygon = Polygon(row.geometry)
        a=[]
        for iter in total_ship_list:
            point_to_check = Point(iter.x,iter.y)  # Example point coordinates
            # Check if the point lies within the polygon
            if polygon.contains(point_to_check):
                a.append(point_to_check)
        if len(a)==1:
            ship_list.append(a[0])
            point_3d = Point(a[0].x, a[0].y, 0.00000)
            index=gdf[gdf['geometry']==point_3d].index[0]
            gdf.at[index,'AIS_Correlation']=row.IMO
        elif len(a)==0:
            pass
        else:
            nearest_point=a[0]
            nearest_dist,_=haversine(a[0].x,a[0].y,buffer_dict[row.geometry].x,buffer_dict[row.geometry].y)
            for ship in a:
                dist,_=haversine(ship.x,ship.y,buffer_dict[row.geometry].x,buffer_dict[row.geometry].y)
                if dist < nearest_dist:
                    nearest_dist=dist
                    nearest_point=ship
            ship_list.append(nearest_point)
            point_3d = Point(nearest_point.x, nearest_point.y, 0.00000)
            index=gdf[gdf['geometry']==point_3d].index[0]
            gdf.at[index,'AIS_Correlation']=row.IMO
    ship_list_gdf = gpd.GeoDataFrame(columns= ['IMO','geometry'],crs='EPSG:4326')
    ship_list_gdf.geometry=ship_list


    ship_list_gdf_index=0
    for row in ship_list_gdf.itertuples(index=False):
        point_3d = Point(row.geometry.x, row.geometry.y, 0.00000)
        ship_list_gdf.loc[ship_list_gdf_index,'geometry']=point_3d
        index=gdf[gdf['geometry']==point_3d].index[0]
        ship_list_gdf.loc[ship_list_gdf_index,'IMO']=gdf.at[index,'AIS_Correlation']
        ship_list_gdf_index+=1

    total_ship_point_gdf = gpd.GeoDataFrame(columns= ['IMO','geometry'],crs='EPSG:4326')
    total_ship_point_gdf.geometry=total_ship_list

    
    json_ship_list_point=ship_list_gdf.to_json()
    json_total_ship_point=total_ship_point_gdf.to_json()

    verify_ais=gpd.GeoDataFrame(columns= ['Image','Number','CORELATION','AIS'])
    verify_ais.Number=gdf.Name
    verify_ais.AIS=gdf.AIS_Correlation
    for index, row in verify_ais.iterrows():
        if row['AIS'] == 'NA':
            verify_ais.at[index, 'CORELATION'] = 'NO'
        else:
            verify_ais.at[index, 'CORELATION'] = 'YES'

    verify_ais_csv = verify_ais.to_csv(index=False)
    # verify_ais_json=verify_ais.to_json()
    combined_json = {
    "ais_point":json_point,
    "point": json_ship_list_point,
    "line": json_line,
    "buffer": json_buffer,
    "ship_point":json_total_ship_point,
    "verify_ais":verify_ais_csv
    }
    # Return the combined JSON object
    return jsonify(combined_json)


def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371 # Radius of earth in kilometers. Use 3956 for miles. Determines return value units.

    # Bearing
    x = sin(dlon)*cos(lat2)
    y = (cos(lat1)*sin(lat2) - (sin(lat1)*cos(lat2)*cos(dlat)))

    bearing = atan2(x,y)
    bearing = degrees(bearing)
    distance = c*r

    return distance , bearing
# To get Interpolated POint
def new_pt(start_lat,start_long, distance_km,bearing_deg):
    new_pt = geopy.distance.distance(kilometers=distance_km).destination((start_lat,start_long), bearing=bearing_deg)
    return new_pt
def meters_to_degrees(meters, latitude):
    # Radius of the Earth at the given latitude
    earth_radius_at_latitude = 6378137.0 / math.sqrt(1 - 0.00669438 * math.sin(math.radians(latitude))**2)

    # Conversion factor from meters to degrees
    meters_to_degrees_conversion = 1 / (earth_radius_at_latitude * math.pi / 180)

    # Convert distance to degrees
    degrees = meters * meters_to_degrees_conversion
    return degrees
db_connection = {
    "dbname": "main",
    "user": "postgres",
    "password": "12345678",
    "host": "localhost",
    "port":"5432"
}

# Function to save the image and IMO number to the database
def save_to_database(imo, image_data):
    conn = psycopg2.connect(**db_connection)
    cur = conn.cursor()
    cur.execute("INSERT INTO ship (imo, image_data) VALUES (%s, %s)", (imo, psycopg2.Binary(image_data)))
    conn.commit()
    cur.close()
    conn.close()
@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        imo = request.form["imo"]
        image = request.files["image"]

        # Save the image to the database
        if image.filename != '':
            image_data = image.read()
            save_to_database(imo, image_data)
            return redirect(url_for("index"))

    return render_template("index.html")
def get_image_data_by_imo(imo_number):
    conn = psycopg2.connect(**db_connection)
    cur = conn.cursor()
    cur.execute("SELECT image_data FROM ship WHERE imo = %s", (imo_number,))
    image_data = cur.fetchone()
    cur.close()
    conn.close()
    return image_data[0] if image_data else None

@app.route('/get_image', methods=['POST'])
def get_image():
    print(request.data)
    data = request.data.decode('utf-8')  # Decode the bytes object to string
    print(data)
    if data:
        imo_number = json.loads(data)
        # Retrieve image data from the database
        image_data = get_image_data_by_imo(imo_number)
        if image_data:
            # Convert memoryview to bytes
            image_bytes = bytes(image_data)
            
            # Open image from bytes
            img = Image.open(io.BytesIO(image_bytes))
            
            # Resize image to 200x200
            img_resized = img.resize((250, 200))
            
            # Create a response with the resized image data
            with io.BytesIO() as output:
                img_resized.save(output, format='JPEG')
                response = make_response(output.getvalue())
            
            response.headers['Content-Type'] = 'image/jpeg'
            return response
        else:
            return None
    else:
        return 'Image not found', 404
if __name__ == '__main__':
    app.run(debug=True)
