import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getUserInfo from "../../utilities/decodeJwt";

function Highlights() {
  const [user, setUser] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newHighlight, setNewHighlight] = useState({ lineId: "", stationId: "" });

  useEffect(() => {
    const userInfo = getUserInfo();
    setUser(userInfo);
    if (userInfo.id) {
      fetchHighlights(userInfo.id);
    }
  }, []);

  const fetchHighlights = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8081/highlight/getAll?userId=${userId}`);
      setHighlights(response.data);
    } catch (error) {
      console.error("Error fetching highlights", error);
    }
  }

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
      setShowForm(false);
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

  if (user === null) return (<div><h4>Log in to view this page.</h4></div>)

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Highlights of {user.username}</h1>
        <button onClick={() => setShowForm(true)}>Add Highlight</button>
        {showForm && (
          <form onSubmit={handleSubmit}>
            <input type="text" name="lineId" placeholder="Line ID" value={newHighlight.lineId} onChange={handleInputChange} />
            <input type="text" name="stationId" placeholder="Station ID" value={newHighlight.stationId} onChange={handleInputChange} />
            <button type="submit">Submit</button>
          </form>
        )}
        <div className="col-md-12 text-center">
          {highlights && highlights.length > 0 ? (
            <ul>
              {highlights.map(highlight => (
                <li key={highlight._id} style={{ marginBottom: '10px' }}>
                  <strong>Line ID:</strong> {highlight.lineId}<br />
                  <strong>Station ID:</strong> {highlight.stationId}
                  <button onClick={() => handleDelete(highlight._id)}>Delete</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No highlights found.</p>
          )}
        </div>
      </div>
    </div>
  );
  
  
};

export default Highlights;
