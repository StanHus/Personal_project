import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.post("/list", async (req, res) => {
  try {
    const { muscles_trained } = req.body;
    const list = await client.query(
      "INSERT INTO plan (muscles_trained) VALUES($1) RETURNING *",
      [muscles_trained]
    );
    console.log("success")
    res.json(list.rows[0]);
  } catch (err) {
    res.status(500).send(err)
  }
});

//get the list

app.get("/list", async (req, res) => {
  console.log("trying")
  try {
    const list = await client.query('SELECT * FROM plan ORDER BY id');
    res.json(list.rows);
    console.log("success")
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
});

//get the session by id

app.get("/list/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await client.query("SELECT * FROM plan WHERE id = $1", [
      id
    ]);

    res.json(session.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

//update muscles_trained ONLY session

app.put("/list/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { muscles_trained } = req.body;
    const updateSession = await client.query(
      "UPDATE plan SET muscles_trained = $1 WHERE id = $2",
      [muscles_trained, id]
    );
    res.json("Muscles_trained category was updated!");
  } catch (err) {
    console.error(err.message);
  }
});

//delete a session

app.delete("/list/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleteSession = await client.query("DELETE FROM plan WHERE id = $1", [
      id
    ]);
    res.json("Session was deleted!");
  } catch (err) {
    console.log(err.message);
  }
});

const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});