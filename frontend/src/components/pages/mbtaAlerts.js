import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from 'react-bootstrap/Card';
import getUserInfo from "../../utilities/decodeJwt";
import trainImage from '../images/stylishTrain01.JPG';

function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('All');
    const [userHighlights, setUserHighlights] = useState([]);
    const [selectedHighlight, setSelectedHighlight] = useState('');

    useEffect(() => {
        const fetchUserHighlights = async () => {
            try {
                const userInfo = getUserInfo();
                if (userInfo && userInfo.username) {
                    const response = await axios.get(`http://localhost:8081/highlight/getAll?userId=${userInfo.username}`);
                    setUserHighlights(response.data);
                }
            } catch (error) {
                console.error("Error fetching user highlights:", error);
            }
        };

        const fetchAlerts = async () => {
            try {
                const result = await axios('https://api-v3.mbta.com/alerts?filter[route_type]=0,1');
                setAlerts(result.data.data);
            } catch (error) {
                console.error("Error fetching alerts:", error);
            }
        };

        fetchUserHighlights();
        fetchAlerts();
    }, []);

    const handleHighlightChange = (event) => {
        setSelectedHighlight(event.target.value);
    };

    const filteredAlerts = alerts.filter(alert => {
        const matchesSeverity = filter === 'All' || alert.attributes.severity === parseInt(filter);
        const matchesHighlight = !selectedHighlight || alert.attributes.informed_entity.some(entity =>
            entity.route === userHighlights.find(h => h._id === selectedHighlight)?.lineId);

        return matchesSeverity && matchesHighlight;
    });

    const getCardStyle = (alert) => {
        const lineId = alert.attributes.informed_entity[0]?.route || "";
        switch (lineId) {
            case "Blue":
                return { borderColor: "blue", borderWidth: "3px", borderStyle: "solid" };
            case "Red":
                return { borderColor: "red", borderWidth: "3px", borderStyle: "solid" };
            case "Orange":
                return { borderColor: "orange", borderWidth: "3px", borderStyle: "solid" };
            case "Green":
                return { borderColor: "green", borderWidth: "3px", borderStyle: "solid" };
            default:
                return { borderColor: "grey", borderWidth: "2px", borderStyle: "solid" };
        }
    };

    return (
        <div className="alerts-container ml-3 border border-secondary rounded p-3" style={{
            width: '100%', 
            maxHeight: '500px', 
            overflowY: 'auto',
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)), url(${trainImage})`,            
            backgroundSize: 'cover',
            backgroundPosition: 'center'

        }}>
            <div className="text-center">
                <h4>MBTA Alerts</h4>

            </div>
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
                <label>
                    Filter by Alert Preference:
                    <select value={selectedHighlight} onChange={handleHighlightChange}>
                        <option value="">Select Saved Preference</option>
                        {userHighlights.map((highlight) => (
                            <option key={highlight._id} value={highlight._id}>
                                {highlight.lineId} Line - {highlight.stationId}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                    <Card
                        key={alert.id}
                        className="mx-auto my-2"
                        style={getCardStyle(alert)}
                    >
                        <Card.Body>
                            <Card.Title>{alert.attributes.header}</Card.Title>
                            <Card.Text>
                                {alert.attributes.description}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                ))
            ) : (
                <div className="text-center mt-3">
                    <p>No {filter === 'All' ? 'alerts found for subways.' : `${filter === '1' ? 'minor' : filter === '7' ? 'major' : 'critical'} alerts found for subways!`}</p>
                </div>
            )}
        </div>
    );

}

export default Alerts;
