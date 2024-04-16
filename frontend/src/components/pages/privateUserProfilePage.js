import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import getUserInfo from "../../utilities/decodeJwt";

const PrivateUserProfile = () => {
  const url = process.env.REACT_APP_BACKEND_SERVER_URI;
  const [user, setUser] = useState({});
  const [stations, setStations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ line: "", station: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({ line: "", station: "" });
  const [imageData, setImageData] = useState('');

  useEffect(() => {
    const userInfo = getUserInfo();
    console.log("User Info:", userInfo);
    setUser(userInfo);
    fetchStations();
    fetchFavorites();
    fetchImage();
  }, []);

  const fetchImage = async () => {
    try {
      const response = await axios.get(`${url}/image/getByName/testImage3`);
      const base64Image = response.data.imageData;
      const imageUrl = `data:image/png;base64,${base64Image}`;
      setImageData(imageUrl);
    } catch (error) {
      console.error('Error fetching image:', error);
    }
  };


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


  const fetchFavorites = async () => {
    try {
      const userInfo = getUserInfo();
      const response = await axios.get(`${url}/favorite/getByUserId?userId=${userInfo.username}`);
      setFavorites(response.data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const handleAddShow = () => setShowAddModal(true);
  const handleAddClose = () => setShowAddModal(false);

  const handleAddChange = (e) => {
    setAddFormData({
      ...addFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const userInfo = getUserInfo();
    const payload = {
      ...addFormData,
      userId: userInfo.username,
    };
    console.log("Sending payload:", payload);
    try {
      const response = await axios.post(`${url}/favorite`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log("Response:", response);
      setFavorites([...favorites, response.data.favorite]);
      setAddFormData({ line: "", station: "" });
      handleAddClose();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error === 'Favorite already exists') {
        alert('That favorite already exists');
      } else {
        console.error("Error adding favorite:", error.response ? error.response.data : error);
      }
    }
  };

  const handleEdit = (favorite) => {
    setEditingId(favorite._id);
    setEditFormData({ line: favorite.line, station: favorite.station });
  };

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditSave = async (id) => {
    try {
      const userInfo = getUserInfo();
      await axios.put(`${url}/favorite/editFavorite/${id}`, {
        ...editFormData,
        userId: userInfo.username,
      });
      const newFavorites = favorites.map((fav) =>
        fav._id === id ? { ...fav, ...editFormData } : fav
      );
      setFavorites(newFavorites);
      setEditingId(null);
    } catch (error) {
      console.error("Error updating favorite:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const userInfo = getUserInfo();
      await axios.delete(`${url}/favorite/deleteFavorite/${id}`, {
        data: { userId: userInfo.username },
      });
      setFavorites(favorites.filter((fav) => fav._id !== id));
    } catch (error) {
      console.error("Error deleting favorite:", error);
    }
  };

  if (!user) return <div><h4>Log in to view this page.</h4></div>;

  const allowedLines = ["Blue", "Red", "Green", "Orange"];

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Welcome back {user && user.username}</h1>
        {imageData && (
          <div className="user-profile-image">
            <img
              src={imageData}
              alt="Test"
              style={{ maxWidth: '175px', borderRadius: '50%', marginBottom: '20px' }}
            />
          </div>
        )}
        <h2>Favorites</h2>
        <p>You can find your favorite lines and stations right below!</p>
        <Button onClick={handleAddShow} className="mb-3">Add Favorite</Button>
        <ul>
          {favorites.map((favorite) => (
            <li key={favorite._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              {editingId === favorite._id ? (
                <>
                  <Form.Select
                    name="line"
                    value={editFormData.line}
                    onChange={handleEditChange}
                    style={{ marginRight: '10px' }}
                  >
                    <option value="">Select Line</option>
                    {allowedLines.map((line) => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </Form.Select>
                  <Form.Select
                    name="station"
                    value={editFormData.station}
                    onChange={handleEditChange}
                    style={{ marginRight: '10px' }}
                  >
                    <option value="">Select a station</option>
                    {[...new Set(stations.map(station => station.name))].sort().map((stationName) => (
                      <option key={stationName} value={stationName}>
                        {stationName}
                      </option>
                    ))}
                  </Form.Select>
                  <Button variant="success" onClick={() => handleEditSave(favorite._id)} style={{ marginRight: '10px' }}>Save</Button>
                  <Button variant="danger" onClick={() => handleDelete(favorite._id)}>Delete</Button>
                </>

              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{favorite.line} Line - {favorite.station}</span>
                  <Button onClick={() => handleEdit(favorite)} style={{ marginRight: '10px' }}>Edit</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Modal show={showAddModal} onHide={handleAddClose}>
        <Modal.Header closeButton>
          <Modal.Title>Add Favorite</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddSubmit}>
            <Form.Group as={Row} controlId="line">
              <Form.Label column sm={3}>Line</Form.Label>
              <Col sm={9}>
                <Form.Control as="select" name="line" value={addFormData.line} onChange={handleAddChange} required>
                  <option value="">Select Line</option>
                  {allowedLines.map((line) => (
                    <option key={line} value={line}>{line}</option>
                  ))}
                </Form.Control>
              </Col>
            </Form.Group>
            <Form.Group as={Row} controlId="station" className="mt-2">
              <Form.Label column sm={3}>Station</Form.Label>
              <Col sm={9}>
                <Form.Control as="select" name="station" value={addFormData.station} onChange={handleAddChange} required>
                  <option value="">Select a station</option>
                  {[...new Set(stations.map(station => station.name))].sort().map((stationName) => (
                    <option key={stationName} value={stationName}>
                      {stationName}
                    </option>
                  ))}
                </Form.Control>
              </Col>
            </Form.Group>
            <div className="text-end mt-3">
              <Button variant="primary" type="submit">Add</Button>
              <Button variant="secondary" onClick={handleAddClose}>Close</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
};
export default PrivateUserProfile;