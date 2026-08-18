import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import getUserInfo from "../../utilities/decodeJwt";



const Notes = () => {  
  const url = process.env.REACT_APP_BACKEND_SERVER_URI
  const [user, setUser] = useState({});
  const [notes, setNotes] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ station: "", note: "" });
    
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
  
  useEffect(() => {
    const initializeNotes = async () => {
      const userInfo = getUserInfo();      
      if (userInfo && userInfo.username) {
        setUser(userInfo);
        await fetchNotes(userInfo.username);
      } else {
        console.error("User information is not available.");
      }
    };  
    initializeNotes();
  }, []);  

  const handleEditNote = (stationKey) => {    
    setEditingId(stationKey);
    setEditFormData({ station: stationKey, note: notes[stationKey] });
  };

  const handleNoteChange = (edit) => {
    setEditFormData({
      ...editFormData,
      [edit.target.name]: edit.target.value,
    });
  };


  const handleNoteSave = async (userId, stationId) => {    
    try {      
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
                  <Form 
                    name="station"
                    value={editFormData.station}
                    readOnly
                    style={{ marginRight: '10px'}}
                  >
                  <option value="">{stationKey}</option>
                  </Form>
                  <Form.Control
                    type="text"
                    name="note"
                    value={editFormData.note}
                    onChange={handleNoteChange}
                    style={{ marginRight: '10px' }}
                  />
                  <Button variant="success" onClick={() => handleNoteSave(user.username, {[stationKey]: editFormData.note})} style={{ marginRight: '10px' }}>Save</Button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{stationKey} - {notes[stationKey]}</span>
                  <Button onClick={() => handleEditNote(stationKey)} style={{ marginRight: '10px' }}>Edit</Button>                  
                  <Button variant="danger" onClick={() => handleDeleteNote(user.username, {[stationKey]: ""})}>Delete</Button>
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
