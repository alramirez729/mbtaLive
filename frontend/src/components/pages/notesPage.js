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
  }, []);
  
  const fetchNotes = async () => {
    try {
      const response = await axios.get(`http://localhost:8081/note/byId/?userId=${user.username}`);      
      setNotes(response.data.stationId);
    } catch (error) {
      console.error("Error fetching notes", error);
    }
  };
  
  fetchNotes();

  const handleEdit = (stationKey) => {    
    setEditingId(stationKey);
    setEditFormData({ station: stationKey, note: notes[stationKey] });
  };

  const handleEditChange = (edit) => {
    setEditFormData({
      ...editFormData,
      [edit.target.name]: edit.target.value,
    });
  };

  const handleEditSave = async (stationKey) => {
    try {      
      await axios.put(`http://localhost:8081/note`,{
        userId: user.username, 
        stationId: {
          stationKey: notes[stationKey]
        }
      });
      fetchNotes()
      setEditingId(null); // Exit editing mode
    } catch (error) {
      console.error("Error editing note:", error);
    }
  };

  const handleDelete = async (userId, stationKey) => {
    const station = {};
    station[stationKey] = ""
    try {
            await axios.delete(`http://localhost:8081/note`, {
              userId: userId,
              stationId: station    
            });
      // Update state to reflect the deletion
      setNotes(notes.filter(note => user.username !== userId));
    } catch (error) {
      console.error("Error deleting note:", error);
      // Handle error (e.g., display an error message)
    }
  };

  
  if (!user) return (<div><h4>Log in to view this page.</h4></div>)    
  

  return (
    <div className="container">
      <div className="col-md-12 text-center">
        <h1>Welcome back {user.username}</h1>        
        <ul>
          {Object.keys(notes).map((stationKey) => (
            <li key={stationKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              {editingId === stationKey ? (
                <>
                  <Form.Select
                    name="Station"
                    value={editFormData.station}
                    readOnly
                    style={{ marginRight: '10px' }}
                  >
                  <option value="">{stationKey}</option>
                  </Form.Select>
                  <Form.Control
                    type="text"
                    name="Note"
                    value={editFormData.note}
                    onChange={handleEditChange}
                    style={{ marginRight: '10px' }}
                  />
                  <Button variant="success" onClick={() => handleEditSave(user.username, {stationKey: notes[stationKey]})} style={{ marginRight: '10px' }}>Save</Button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{stationKey} - {notes[stationKey]}</span>
                  <Button onClick={() => handleEdit(stationKey)} style={{ marginRight: '10px' }}>Edit</Button>                   
                  <Button variant="danger" onClick={() => handleDelete(user.username, stationKey)}>Delete</Button>
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
