import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import getUserInfo from "../../utilities/decodeJwt";
const MINLIMIT = 3
const MAXLIMIT = 100

const PrivateUserProfile = () => {
  const url = process.env.REACT_APP_BACKEND_SERVER_URI;
  const [user, setUser] = useState({});
  const [stations, setStations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [imageData, setImageData] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newHighlight, setNewHighlight] = useState({ lineId: "", stationId: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({ line: "", station: "" });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ line: "", station: "" });
  const [notes, setNotes] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const allowedLines = ["Blue", "Red", "Green", "Orange"];

  useEffect(() => {
    const userInfo = getUserInfo();
    setUser(userInfo);
    if (userInfo && userInfo.username) {
      fetchStations();
      fetchNotes(userInfo.username);
      fetchFavorites(userInfo.username);
      fetchHighlights(userInfo.username);
      fetchImage();
    }
    else{
      console.error("User information is not available.");
    }
  }, []);

  const fetchNotes = async (username) => {    
    try {      
      let response = await axios.get(`${url}/note/byId/?userId=${username}`);
      if(!response.data.stationId){
        response.data.stationId = {}
      }
      setNotes(response.data.stationId);
    } catch (error) {
      console.error("Error fetching notes", error);
    }
  };
  
  const fetchHighlights = async (username) => {
    try {
      const response = await axios.get(`${url}/highlight/getAll`, {
        params: { userId: username }
      });
      setHighlights(response.data);
    } catch (error) {
      console.error("Error fetching highlights:", error);
      setHighlights([]);
    }
  };

  const handleAddHighlight = async (e) => {
    e.preventDefault();
    try {
      const userId = user.username;
      await axios.post(`${url}/highlight/createHighlight`, { ...newHighlight, userId });
      setNewHighlight({ lineId: "", stationId: "" });  // Reset form after submission
      setShowModal(false);  // Close modal after submission
      fetchHighlights(userId);  // Refresh highlights list
    } catch (error) {
      console.error("Error creating highlight:", error);
    }
  };

  const handleDeleteHighlight = async (highlightId) => {
    try {
      await axios.delete(`${url}/highlight/delete/${highlightId}`);
      fetchHighlights(user.username);  // Refresh highlights list
    } catch (error) {
      console.error("Error deleting highlight:", error);
    }
  };


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


  const fetchFavorites = async (username) => {
    try {
      const response = await axios.get(`${url}/favorite/getByUserId`, {
        params: { userId: username }
      });
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

  const handleEditNote = (stationKey) => {    
    setEditingId(stationKey);
    setEditFormData({ station: stationKey, note: notes[stationKey] });
  };

  const handleNoteChange = (e) => {    
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    });
    if (e.target.value.length < MINLIMIT) {
      setErrorMessage(`Input must be at least ${MINLIMIT} characters.'`);
    } else if (e.target.value.length > MAXLIMIT) {
      setErrorMessage(`Input must be at most ${MAXLIMIT} characters.`);
    } else {
      setErrorMessage('');      
    }    
  };


  const handleNoteSave = async (userId, stationId) => {    
      try {      
        const note = editFormData
        if (!note || note.length < MINLIMIT) {      
          setErrorMessage('Input must be at least 3 characters.');
          return
        }
        await axios.put(`${url}/note`,{
              userId: userId,
              stationId: stationId
        });
        const updatedNotes = { ...notes }
        updatedNotes[Object.keys(stationId)[0]] = Object.values(stationId)[0]
        setNotes(updatedNotes);
        setEditingId(null); // Exit editing mode
      } catch (error) {
        console.error("Error editing note:", error);
      }    
  };

  const handleDeleteNote = async (userId, stationId) => {    
    try {
          await axios.delete(`${url}/note`, {
            data: {userId: userId,
            stationId: stationId}
          });
          // Update state to reflect the deletion
          const updatedNotes = { ...notes };
          delete updatedNotes[Object.keys(stationId)[0]];
          setNotes(updatedNotes);          
    } catch (error) {
      console.error("Error deleting note:", error);
      // Handle error (e.g., display an error message)
    }
  };

  if (!user) return <div><h4>Log in to view this page.</h4></div>;

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Welcome back {user && user.username}</h1>
        {imageData && (
          <div className="user-profile-image">
            <img
              src={imageData}
              alt="User Profile"
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
        <h2>Alert Preferences</h2>
        <Button onClick={() => setShowModal(true)} className="mb-3">Add Highlight</Button>
        <ul>
          {highlights.map((highlight) => (
            <li key={highlight._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '10px' }}>{highlight.lineId} Line - {highlight.stationId}</span>
                <Button variant="danger" onClick={() => handleDeleteHighlight(highlight._id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="col-md-12 text-center">
        <h2>Notes</h2>
        <ul>
          {Object.keys(notes).map((stationKey) => (
            <li key={stationKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>              
              {editingId === stationKey ? (
                <>
                  <Form 
                    name="station"
                    value={editFormData.station}
                    readOnly
                    style={{ marginRight: '10px'}}
                  >
                  <option value="">{stationKey}</option>
                  <option>{errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}</option>
                  </Form>
                  <Form.Control
                    type="text"
                    name="note"
                    value={editFormData.note}
                    onChange={handleNoteChange}
                    style={{ marginRight: '10px' }}
                  />
                  <Button variant="success" onClick={() => handleNoteSave(user.username, {[stationKey]: editFormData.note})} style={{ marginRight: '10px' }}>Save</Button>
                  <Button variant="danger" onClick={() => handleDeleteNote(user.username, {[stationKey]: ""})}>Delete</Button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{stationKey} - {notes[stationKey]}</span>
                  <Button onClick={() => handleEditNote(stationKey)} style={{ marginRight: '10px' }}>Edit</Button>                  
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
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Highlight</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddHighlight}>
            <Form.Group as={Row} controlId="lineId">
              <Form.Label column sm={3}>Line ID</Form.Label>
              <Col sm={9}>
                <Form.Control as="select" name="lineId" value={newHighlight.lineId} onChange={(e) => setNewHighlight({...newHighlight, lineId: e.target.value})} required>
                  <option value="">Select Line ID</option>
                    {allowedLines.map((line) => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                </Form.Control>
              </Col>
            </Form.Group>
            <Form.Group as={Row} controlId="stationId">
              <Form.Label column sm={3}>Station</Form.Label>
              <Col sm={9}>
                <Form.Control as="select" name="stationId" value={newHighlight.stationId} onChange={(e) => setNewHighlight({...newHighlight, stationId: e.target.value})} required>
                  <option value="">Select a station</option>
                    {[...new Set(stations.map(station => station.name))].sort().map((stationName) => (
                      <option key={stationName} value={stationName}>
                      {stationName}</option>
                    ))}
                </Form.Control>
              </Col>
            </Form.Group>
            <div className="text-end mt-3">
              <Button variant="primary" type="submit">Add</Button>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>      
    </div>

  );
};
export default PrivateUserProfile;