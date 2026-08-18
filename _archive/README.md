# Archive

Dead code, kept only so the old user accounts feature can be read or revived
later. **Nothing here is imported, built, tested, or deployed.**

The Mongo cluster this depended on has been spun down. The app no longer opens a
database connection at all, so there is no connection string to point anywhere
and no failure mode when the cluster stays down.

## What is here

| Path | Was |
| --- | --- |
| `backend/routes/` | Express routes for users, notes, highlights, favorites, images |
| `backend/models/` | Mongoose models and the Joi/Zod validators |
| `backend/config/db.config.js` | The Mongoose connection |
| `backend/utilities/generateToken.js` | JWT signing |
| `backend/server.js.old` | The old server entry point, which mounted all of the above |
| `frontend/*.js` | Login, register, profile, notes, highlights, home, landing pages |
| `frontend/navbar.js` | Navbar with the login/profile dropdown |
| `frontend/utilities/decodeJwt.js` | Read the JWT out of localStorage |
| `frontend/LiveMap.js.old` | The previous map, before the rewrite |
| `frontend/mbtaAlerts.js.old` | The previous alerts list |
| `frontend/images/` | PNG marker and background images the old map used |

## If you bring accounts back

Read these first, because the archived code has real problems beyond being
disconnected:

- **The JWT payload contained the user's password hash.** `generateToken.js`
  signed `{id, email, username, password}`. A JWT payload is base64, not
  encrypted, so the hash was handed to the browser on every login and
  `homePage.js` printed it on screen. Do not carry this forward.
- **No route verified a token.** The only `Authorization` usage in the whole
  backend is `userLogin.js:39` and `userEditUser.js:40` *setting* the header.
  Nothing ever called `jwt.verify`. Any caller could read or write any user's
  notes, highlights, and favorites by passing someone else's id.
- **`userGetAllUsers` returned every user record** with no projection, so the
  password hashes went out over `GET /user/getAll` too.
- **Notes were addressed by `username`, not by id.** The frontend called
  `/note/byId/?userId=<username>`. Renaming a user would have orphaned their data.
- Access tokens expired in `1m`, with no refresh flow, so sessions broke a minute
  after login.
- **The old map wrote notes on a station-name key** (`{ "Park Street": "..." }`),
  so a station rename silently lost the note.
- The current frontend is Vite and React 18 with no Bootstrap. These pages import
  `react-bootstrap`, `axios`, and `jwt-decode`, none of which are dependencies any
  more. Reviving a page means adding those back or rewriting its markup.

Treat this as a starting point to read, not code to re-mount as is.
