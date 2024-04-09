import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import customMarkerIcon from '../images/mbta.png';
import blueLineMarkerIcon from '../images/blue_line.png';
import greenLineMarkerIcon from '../images/green_line.png';
import redLineMarkerIcon from '../images/red_line.png';
import orangeLineMarkerIcon from '../images/orange_line.png';
import axios from 'axios';
import Alerts from './mbtaAlerts';

function LiveMap() {
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  const [stops, setStops] = useState({});
  const [description, setDescription] = useState({});
  const [map, setMap] = useState(null);

  useEffect(() => {
    const leafletMap = L.map('map').setView([42.3601, -71.0589], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(leafletMap);

    setMap(leafletMap);

    const fetchData = async () => {
      try {
        const vehicleResult = await axios.get('https://api-v3.mbta.com/vehicles?filter%5Broute_type%5D=1');
        setVehicles(vehicleResult.data.data);

        const stopResult = await axios.get('https://api-v3.mbta.com/stops?filter%5Broute_type%5D=1');        
        const stopsData = await stopResult.data.data.reduce((acc, stop) => {
          acc[stop.id] = stop.attributes.name;
          return acc;
        }, {});
        setStops(stopsData);
                
        const descriptionResult = await axios.get('https://api-v3.mbta.com/stops?filter%5Broute_type%5D=1');
        const descriptionData = descriptionResult.data.data.reduce((acc, stop) => {
          acc[stop.id] = stop.attributes.description;
          return acc;
        }, {});
        setDescription(descriptionData);
      
      
        const stationResult = await fetch("https://api-v3.mbta.com/stops?filter[route_type]=1");

        const stationData = await stationResult.json();
        setStations(stationData.data.map((station) => ({
          name: station.attributes.name,
          longitude: station.attributes.longitude,
          latitude: station.attributes.latitude,
          description: station.attributes.description
        })));

      
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };

    fetchData();

    const refreshInterval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => {
      clearInterval(refreshInterval);
    };
  }, []); 

  useEffect(() => {
    if (map) {
      map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      stations.forEach((station) => {
        const { latitude, longitude, name, description } = station || {};
        if (latitude && longitude) {
          const stationName = name || 'Unknown Stop';
          const stationDescription = description || 'No Description';          
          
          let markerSize = [35, 35];          
          
          const stationMarker = L.marker([latitude, longitude], { icon: L.icon({ iconUrl: customMarkerIcon, iconSize: markerSize }) });

          stationMarker.addTo(map).bindPopup(`${stationName}<br/>Description: ${stationDescription.replace(`${stationName} - `, '')}`);
        }
      });

      vehicles.forEach((vehicle) => {
        const { latitude, longitude, label } = vehicle.attributes || {};
        if (latitude && longitude && vehicle.relationships.stop && vehicle.relationships.stop.data) {
          const stopId = vehicle.relationships.stop.data.id;
          const stopName = stops[stopId] || 'Unknown Stop';
          const stopDescription = description[stopId] || 'No Description';
          
          let markerIcon = customMarkerIcon;
          let markerSize = [32, 32];
          console.log(stopId);
          
          const routeId = vehicle.relationships.route.data.id;
          switch (routeId) {
              case "Blue":
                  markerIcon = blueLineMarkerIcon;
                  break;
              case "Red":
                  markerIcon = redLineMarkerIcon;
                  break;
              case "Green":
                  markerIcon = greenLineMarkerIcon;
                  break;
              case "Orange":
                  markerIcon = orangeLineMarkerIcon;
                  break;
            }

          const customMarker = L.marker([latitude, longitude], { icon: L.icon({ iconUrl: markerIcon, iconSize: markerSize }) });

          customMarker.addTo(map).bindPopup(`Vehicle: #${label}<br/>Stop: ${stopName}<br/>Description: ${stopDescription.replace(`${stopName} - `, '')}`);
        }
      });
      
    }



  }, [map, vehicles, stops, description, stations]);

  return (
    <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center' }}>
       <div style={{ border: '5px solid grey', borderRadius: '10px', width: '50%' }}>
       <div id="map" style={{ height: '500px', borderRadius: '8px' }}></div>
       </div>
       <div style={{ marginLeft: '20px', border: '5px solid grey', borderRadius: '10px', width: '30%', maxHeight: '500px', overflowY: 'auto' }}>
         <Alerts /> {/* Include the Alerts component */}
       </div>
    </div>
  );
}

export default LiveMap;
