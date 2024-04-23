import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from 'react-bootstrap/Card';
import getUserInfo from "../../utilities/decodeJwt";
import trainImage from '../images/stylishTrain01.JPG';


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
            {/* Include the image next to the header */}
            <div className="text-center">
                <h4 style={{ display: 'inline-block', marginLeft: '10px' }}>MBTA Alerts</h4>
                <img src={trainImage} alt="Stylish Train" style={{ position: 'absolute', left: '260px', top: '50px', width: '130px', verticalAlign: 'middle' }} />
            </div>
            <div>
                <label>
                    Filter by Severity:
                    <select style= {{position: 'absolute', top:'90px', left:'145px'}} value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="All">All</option>
                        <option value="1">Minor</option>
                        <option value="7">Major</option>
                        <option value="10">Critical</option>
                    </select>
                </label>
            </div>
            <div style={{ marginTop: '10px' }}>
                <label>
                    Filter by Alert Preference:
                    <select onChange={handleHighlightChange} value={selectedHighlight?._id || ''}>
                        {userHighlights.map((highlight) => (
                            <option key={highlight._id} value={highlight._id}>
                                {getStationNameById(highlight.stationId)} - {highlight.lineId}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {filteredAlerts.map((alert) => (
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
            ))}
        </div>
    );
}

export default Alerts;
