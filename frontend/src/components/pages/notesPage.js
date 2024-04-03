import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import getUserInfo from "../../utilities/decodeJwt";

var notes = {}

const Notes = () => {  
  const [user, setUser] = useState({});
  const [stations, setNotes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ station: "", note: "" });
  
  

  
  useEffect(() => {
    setUser(getUserInfo());
    fetchNotes();
  }, []);
  
  const fetchNotes = async () => {
    try {
      const response = await axios.get(`http://localhost:8081/note/byId/?userId=${user.username}`);      
      setNotes(Object.keys(response.data.stationId));
      notes = response.data.stationId
    } catch (error) {
      console.error("Error fetching notes", error);
    }
  };
  

  const handleEdit = (stationKey) => {    
    setEditingId(user.username);
    setEditFormData({ station: stationKey, note: notes[stationKey] });
  };

  const handleEditChange = (edit) => {
    setEditFormData({
      ...editFormData,
      [edit.target.name]: edit.target.value,
    });
  };

  const handleEditSave = async (userId) => {
    try {
      await axios.put(`http://localhost:8081/note/${userId}`, editFormData);
      fetchNotes()
      setEditingId(null); // Exit editing mode
    } catch (error) {
      console.error("Error editing note:", error);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`http://localhost:8081/note/${userId}`);
      // Update state to reflect the deletion
      setNotes(notes.filter(note => user.username !== userId));
    } catch (error) {
      console.error("Error deleting favorite:", error);
      // Handle error (e.g., display an error message)
    }
  };




  
  if (!user) return (<div><h4>Log in to view this page.</h4></div>)    
  

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Welcome back {user.username}</h1>
        <h2>Notes {notes.userId}</h2>
        <ul>
          {stations.map((stationKey) => (
            <li key={stationKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              {editingId === user.username ? (
                <>
                  <Form.Select
                    name="Station"
                    value={editFormData.station}
                    onChange={handleEditChange}
                    style={{ marginRight: '10px' }}
                  >                    
                  </Form.Select>
                  <Form.Control
                    type="text"
                    name="Note"
                    value={editFormData.note}
                    onChange={handleEditChange}
                    style={{ marginRight: '10px' }}
                  />
                  <Button variant="success" onClick={() => handleEditSave(user.username)} style={{ marginRight: '10px' }}>Save</Button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{stationKey} - {notes[stationKey]}</span>
                  <Button onClick={() => handleEdit(stationKey)} style={{ marginRight: '10px' }}>Edit</Button>
                  <Button variant="danger" onClick={() => handleDelete(user.username)}>Delete</Button>
                </div>
              )}
            </li>
          ))}
        </ul>        
      </div>
    </div>
  );
};

export default Notes;
