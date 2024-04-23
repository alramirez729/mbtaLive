import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from 'react-bootstrap/Card';
import getUserInfo from "../../utilities/decodeJwt";

function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('All');
    const [userHighlights, setUserHighlights] = useState([]);
    const [stations, setStations] = useState([]);
    const [selectedHighlight, setSelectedHighlight] = useState(null);

    useEffect(() => {
        const fetchAlerts = async () => {
            const result = await axios('https://api-v3.mbta.com/alerts?filter[route_type]=0,1');
            setAlerts(result.data.data);
        };
        const fetchUserHighlights = async () => {
            const userInfo = getUserInfo();
            if (userInfo && userInfo.id) {
                const response = await axios.get(`http://localhost:8081/highlight/getAll?userId=${userInfo.id}`);
                setUserHighlights(response.data);
            }
        };
        const fetchStations = async () => {
            const response = await fetch("https://api-v3.mbta.com/stops?filter[route_type]=1");
            const data = await response.json();
            setStations(data.data.map(station => ({
                id: station.id,
                name: station.attributes.name
            })));
        };
        fetchAlerts();
        fetchUserHighlights();
        fetchStations();
    }, []);

    const getStationNameById = (stationId) => {
        const station = stations.find(s => s.id === stationId);
        return station ? station.name : 'Unknown Station';
    };

    const handleHighlightChange = (event) => {
        const highlightId = event.target.value;
        const highlight = userHighlights.find(h => h._id === highlightId);
        setSelectedHighlight(highlight || null);
    };

    const filteredAlerts = alerts.filter(alert => {
        const matchesSeverity = filter === 'All' || alert.attributes.severity === parseInt(filter);
        const matchesHighlight = !selectedHighlight || alert.attributes.informed_entity.some(entity => 
            entity.route === selectedHighlight.lineId);

        return matchesSeverity && matchesHighlight;
    });

    // Function to determine the border color and thickness based on the line ID
    const getCardStyle = (alert) => {
        const lineId = alert.attributes.informed_entity[0]?.route || "";
        let borderColor = "grey";
        let borderWidth = "2px";  // Default border width
        switch(lineId) {
            case "Blue":
                borderColor = "blue";
                borderWidth = "6px";  // Thicker border for visibility
                break;
            case "Red":
                borderColor = "red";
                borderWidth = "6px";  // Thicker border for visibility
                break;
            case "Orange":
                borderColor = "orange";
                borderWidth = "6px";  // Thicker border for visibility
                break;
            default:
                borderColor = "grey";
                borderWidth = "3px";  // Default border width
                break;
        }
        return { borderColor: borderColor, borderWidth: borderWidth, borderStyle: 'solid' };
    };

    return (
        <div className="alerts-container ml-3 border border-secondary rounded p-3" style={{ width: '100%', maxHeight: '500px', overflowY: 'auto' }}>
            <h4 className="text-center">MBTA Alerts</h4>
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
            <div style={{ marginTop: '10px' }}>
                <label>
                    Filter by Highlight:
                    <select onChange={handleHighlightChange} value={selectedHighlight?._id || ''}>
                        <option value="">Select Highlight</option>
                        {userHighlights.map((highlight) => (
                            <option key={highlight._id} value={highlight._id}>
                                {getStationNameById(highlight.stationId)} - {highlight.lineId}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                    <Card
                        body
                        outline
                        color="success"
                        className="mx-auto my-2"
                        style={{ maxWidth: '100%', ...getCardStyle(alert) }}  // Apply dynamic style here
                        key={alert.id}
                    >
                        <Card.Body>
                            <Card.Title className="fs-6"><b>{alert.attributes.header}</b></Card.Title>
                            <Card.Text className="fs-6">
                                {alert.attributes.description}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                ))
            ) : (
                <div className="text-center mt-3">
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
