import React, { useState, useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import axios from 'axios';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function fetchData() {
      const result = await axios(
        'https://api-v3.mbta.com/alerts?sort=banner&filter%5Bactivity%5D=BOARD%2CEXIT%2CRIDE',
      );
      setAlerts(result.data.data);
    }
    fetchData();
  }, []);

  const filteredAlerts = filter === 'All' ? alerts : alerts.filter(alert => alert.attributes.severity === parseInt(filter));

  return (
    <div className="alerts-container ml-3 border border-secondary rounded p-3" style={{ width: '100%', maxHeight: '500px', overflowY: 'auto' }}>
      <h4 className="text-center">MBTA Alerts</h4>
      <label>
        Filter by Severity:
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="1">Minor</option>
          <option value="7">Major</option>
          <option value="10">Critical</option>
        </select>
      </label>
      {filteredAlerts.map(alert => (
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
      ))}
    </div>
  );
}

export default Alerts;
