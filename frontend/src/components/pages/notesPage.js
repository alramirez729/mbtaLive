import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import getUserInfo from "../../utilities/decodeJwt";


const Notes = () => {  
  const [user, setUser] = useState({});
  const [notes, setNotes] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ station: "", note: "" });
  
  

  
  useEffect(() => {
    setUser(getUserInfo());
    fetchNotes();
  }, []);
  
  const fetchNotes = async () => {
    try {
      const response = await axios.get(`http://localhost:8081/note/byId?userId=${user.username}`);      
      setNotes(response.data)
    } catch (error) {
      console.error("Error fetching notes", error);
    }
  };

  const handleEdit = (stationKey) => {    
    setEditingId(notes._id);
    setEditFormData({ station: stationKey, note: notes.stationId[stationKey] });
  };

  const handleEditChange = (edit) => {
    setEditFormData({
      ...editFormData,
      [edit.target.name]: edit.target.value,
    });
  };

  const handleEditSave = async (userId) => {
    try {
      await axios.put(`http://localhost:8081/note?${userId}`, editFormData);
      fetchNotes()
      setEditingId(null); // Exit editing mode
    } catch (error) {
      console.error("Error editing note:", error);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`http://localhost:8081/note?${userId}`);
      // Update state to reflect the deletion
      setNotes(notes.filter(note => note.userId !== userId));
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
          {Object.keys(notes.stationId ?? {}).map((stationKey) => (
            <li key={stationKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              {editingId === notes.userId ? (
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
                  <Button variant="success" onClick={() => handleEditSave(notes.userId)} style={{ marginRight: '10px' }}>Save</Button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{stationKey} - {notes[stationKey]}</span>
                  <Button onClick={() => handleEdit(stationKey)} style={{ marginRight: '10px' }}>Edit</Button>
                  <Button variant="danger" onClick={() => handleDelete(notes.userId)}>Delete</Button>
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
