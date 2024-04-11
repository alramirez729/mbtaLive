import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from 'react-bootstrap/Card';
import getUserInfo from "../../utilities/decodeJwt";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('All');
  const [userHighlights, setUserHighlights] = useState([]);
  const [stations, setStations] = useState([]); // State to hold station data
  const [selectedHighlightId, setSelectedHighlightId] = useState('');

  useEffect(() => {
    // Function to fetch alerts
    const fetchAlerts = async () => {
      const result = await axios('https://api-v3.mbta.com/alerts?filter[route_type]=0,1');
      setAlerts(result.data.data);
    };
    fetchAlerts();

    // Function to fetch user highlights
    const fetchUserHighlights = async () => {
      try {
        const userInfo = getUserInfo();
        if (userInfo && userInfo.id) {
          const response = await axios.get(`http://localhost:8081/highlight/getAll?userId=${userInfo.id}`);
          setUserHighlights(response.data);
        }
      } catch (error) {
        console.error("Error fetching user highlights:", error);
      }
    };
    fetchUserHighlights();

    //fetches all the stations for the drop down
    const fetchStations = async () => {
      try {
        const response = await fetch("https://api-v3.mbta.com/stops?filter[route_type]=1");
        const data = await response.json();
        setStations(data.data.map(station => ({
          id: station.id,
          name: station.attributes.name
        })));
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };
    fetchStations();

    
  }, []);

  const getStationNameById = (stationId) => {
    const station = stations.find(s => s.id === stationId);
    return station ? station.name : 'Unknown Station';
  };
  
  const filteredAlerts = filter === 'All' ? alerts : alerts.filter(alert => alert.attributes.severity === parseInt(filter));

  return (
    <div className="alerts-container ml-3 border border-secondary rounded p-3" style={{ width: '100%', maxHeight: '500px', overflowY: 'auto' }}>
      <h4 className="text-center">MBTA Alerts</h4>
      
      {/* Severity Filter */}
      <div>
        <label>
          Filter by Severity:
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="1">Minor</option>
            <option value="7">Major</option>
            <option value="10">Critical</option>
          </select>
        </label>
      </div>
  
      {/* User Highlights Filter */}
      <div style={{ marginTop: '10px' }}>
        <label>
          Filter by Highlight:
          <select onChange={(e) => setSelectedHighlightId(e.target.value)} value={selectedHighlightId}>
            <option value="">Select Highlight</option>
            {userHighlights.map((highlight) => (
              <option key={highlight._id} value={highlight._id}>
                {getStationNameById(highlight.stationId)} - {highlight.lineId} {/* Use getStationNameById to display station name */}
              </option>
            ))}
          </select>
        </label>
      </div>
  
      {/* Filtered Alerts or No Alerts Message */}
      {filteredAlerts.length > 0 ? (
        filteredAlerts.map((alert) => (
          <Card
            body
            outline
            color="success"
            className="mx-auto my-2"
            style={{ maxWidth: '100%' }}
            key={alert.id}
          >
            <Card.Body>
              <Card.Title className="fs-6">Alert</Card.Title>
              <Card.Text className="fs-6">
                {alert.attributes.header}
                {alert.attributes.description}
              </Card.Text>
            </Card.Body>
          </Card>
        ))
      ) : (
        <div className="text-center mt-3">
          {/* Adjust the message based on the selected severity filter */}
          {filter === 'All' ? (
            <p>No alerts found for subways.</p>
          ) : (
            <p>No {filter === '1' ? 'minor' : filter === '7' ? 'major' : 'critical'} alerts for subways!</p>
          )}
        </div>
      )}
    </div>
  );
  
}

export default Alerts;