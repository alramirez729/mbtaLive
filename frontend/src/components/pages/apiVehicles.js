import React, { useState, useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import axios from 'axios';

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const result = await axios.get('https://api-v3.mbta.com/vehicles?filter%5Broute_type%5D=1', {
        headers: {
          accept: "application/vnd.api+json"
        }
      });
      setVehicles(result.data.data);
    }
    fetchData();
  }, []);

  return (
    <div>
      {vehicles.map(vehicle => (
        <Card
          key={vehicle.id}
          body
          outline
          color="success"
          className="mx-1 my-2"
          bg="primary"
          style={{ width: "15rem" }}
        >
          <Card.Body>
            <Card.Title>Vehicle: {vehicle.attributes.label}</Card.Title>
            <Card.Text>Status: {vehicle.attributes.current_status}</Card.Text>
            <Card.Text>Stop Sequence: {vehicle.attributes.current_stop_sequence}</Card.Text>
            <Card.Text>Route ID: {vehicle.relationships.route.data.id}</Card.Text>
            <Card.Text>Trip ID: {vehicle.relationships.trip.data.id}</Card.Text>
          </Card.Body>
        </Card>
      ))}

    </div>
  );
}

export default Vehicles;
