import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getUserInfo from "../../utilities/decodeJwt";

function Highlights() {
  const [user, setUser] = useState({});
  const [highlights, setHighlights] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newHighlight, setNewHighlight] = useState({ userId: "", lineId: "", stationId: "" });

  useEffect(() => {
    setUser(getUserInfo());
    fetchHighlights();
  }, []);

  const fetchHighlights = async() => {
    try {  
      const response = await axios.get(`http://localhost:8081/highlight/getAll`);
      setHighlights(response.data);
    } catch(error) {
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
      await axios.post('http://localhost:8081/highlight/createHighlight', newHighlight);
      setNewHighlight({ userId: "", lineId: "", stationId: "" });
      setShowForm(false);
      fetchHighlights();
    } catch (error) {
      console.error("Error creating highlight", error);
    }
  }

  if (!user) return (<div><h4>Log in to view this page.</h4></div>)

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Highlights of {user.username}</h1>
        <button onClick={() => setShowForm(true)}>Add Highlight</button>
        {showForm && (
          <form onSubmit={handleSubmit}>
            <input type="text" name="userId" placeholder="User ID" value={newHighlight.userId} onChange={handleInputChange} required />
            <input type="text" name="lineId" placeholder="Line ID" value={newHighlight.lineId} onChange={handleInputChange} />
            <input type="text" name="stationId" placeholder="Station ID" value={newHighlight.stationId} onChange={handleInputChange} />
            <button type="submit">Submit</button>
          </form>
        )}
        <div className="col-md-12 text-center">
          <ul>
            {highlights.map(highlight => (
              <li key={highlight._id} style={{ marginBottom: '10px' }}>
                <strong>User ID:</strong> {highlight.userId}<br />
                <strong>Line ID:</strong> {highlight.lineId}<br />
                <strong>Station ID:</strong> {highlight.stationId}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Highlights;
