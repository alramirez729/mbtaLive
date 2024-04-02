import React, { useState, useEffect } from "react";
import axios from "axios";
import getUserInfo from "../../utilities/decodeJwt";



//link to service
//http://localhost:8096/notesPage

const Notes = () => {  
  const [user, setUser] = useState({});
  const [notes, setNotes] = useState({});

  

  useEffect(() => {
    setUser(getUserInfo());    
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`http://localhost:8081/note/byId?userId=${user.username}`);      
      setNotes(response.data.stationId);
    } catch (error) {
      console.error("Error fetching notes", error);
    }
  };
  
  if (!user) return (<div><h4>Log in to view this page.</h4></div>)
  
  return (
    <div className = "container">
      <div className = "col-md-12 text-center">
        <h1>Notes of {user.username}</h1>        
        <div class="col-md-12 text-center">
          <ul>            
          {Object.keys(notes).map(noteId => (
              <li key={noteId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>                
                <div>{noteId} : {notes[noteId]}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    

  );
};

export default Notes;
