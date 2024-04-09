import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getUserInfo from "../../utilities/decodeJwt";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

function Highlights() {
  const [user, setUser] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newHighlight, setNewHighlight] = useState({ lineId: "", stationId: "" });
  const [stations, setStations] = useState([]);
  const allowedLines = ["Blue", "Red", "Green", "Orange"];

  useEffect(() => {
    const userInfo = getUserInfo();
    setUser(userInfo);
    if (userInfo && userInfo.id) {
      fetchHighlights(userInfo.id);
      fetchStations();
    }
  }, []);

  const fetchHighlights = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8081/highlight/getAll?userId=${userId}`);
      setHighlights(response.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // No highlights found, set highlights to an empty array
        setHighlights([]);
      } else {
        console.error("Error fetching highlights", error);
      }
    }
  }

  const fetchStations = async () => {
    try {
      const response = await fetch(
        "https://api-v3.mbta.com/stops?filter[route_type]=1"
      );
      const data = await response.json();
      setStations(
        data.data.map((station) => ({
          id: station.id,
          name: station.attributes.name,
        }))
      );
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewHighlight({ ...newHighlight, [name]: value });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!user || !user.id) {
        console.error("User information is missing");
        return;
      }
      const userId = user.id;
      await axios.post('http://localhost:8081/highlight/createHighlight', { userId, ...newHighlight });
      setNewHighlight({ lineId: "", stationId: "" });
      setShowModal(false);
      fetchHighlights(userId); // Update highlights after adding a new one
    } catch (error) {
      console.error("Error creating highlight", error);
    }
  }

  const handleDelete = async (highlightId) => {
    try {
      await axios.delete(`http://localhost:8081/highlight/delete/${highlightId}`);
      fetchHighlights(user.id); // Update highlights after deleting one
    } catch (error) {
      console.error("Error deleting highlight", error);
    }
  }

  if (!user) return (<div><h4>Log in to view this page.</h4></div>)

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Highlights of {user.username || 'User'}</h1>
        <Button onClick={() => setShowModal(true)}>Add Highlight</Button>
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Add Highlight</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="lineId">
                <Form.Label>Line ID</Form.Label>
                <Form.Select
                  name="lineId"
                  value={newHighlight.lineId}
                  onChange={handleInputChange}
                >
                  <option value="">Select Line</option>
                  {allowedLines.map(line => (
                    <option key={line} value={line}>{line}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group controlId="stationId">
                <Form.Label>Station</Form.Label>
                <Form.Select
                  name="stationId"
                  value={newHighlight.stationId}
                  onChange={handleInputChange}
                >
                  <option value="">Select Station</option>
                  {stations.map(station => (
                    <option key={station.id} value={station.id}>{station.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Button variant="primary" type="submit">
                Submit
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
        <div className="col-md-12 text-center">
          {highlights && highlights.length > 0 ? (
            <ul>
              {highlights.map(highlight => {
                const station = stations.find(station => station.id === highlight.stationId);
                return (
                  <li key={highlight._id} style={{ marginBottom: '10px' }}>
                    <strong>Line ID:</strong> {highlight.lineId}<br />
                    <strong>Station:</strong> {station ? station.name : 'Unknown station'}
                    <Button onClick={() => handleDelete(highlight._id)}>Delete</Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No highlights found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Highlights;
