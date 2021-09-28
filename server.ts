import { Pool } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import {DeleteThis, UpdateThis} from "./functions"

config();

const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const pool = new Pool(dbConfig);
export {pool}
pool.connect();

app.post("/list", async (req, res) => {
  try {
    const { muscles_trained } = req.body;
    const list = await pool.query(
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
    const list = await pool.query('SELECT * FROM plan ORDER BY id');
    res.json(list.rows);
    console.log("success")
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
});

//open the session page

app.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await pool.query("SELECT * FROM plan WHERE id = $1", [
      id
    ]);
    res.json(session.rows[0])
  } catch (err) {
    console.error(err.message);
  }
});

//update muscles_trained ONLY session (new version)

app.put("/:id", async (req, res) => {

    const { id } = req.params;
    const { muscles_trained } = req.body;
    const updateSession = UpdateThis(muscles_trained, id)

    if (updateSession){
      res.json("Muscles_trained category was updated!");
    }
    else {
      console.error("problem in updating")
    }
});

//delete a session (new version)

app.delete("/:id", async (req, res) => {

  const { id } = req.params;
  const deleteSession = DeleteThis(id)
  
  if (deleteSession){
  res.json("Session was deleted!");
  res.status(200)
}
  else{
    console.error("problem in deleting")
    res.status(400)
  }
});

//make a suggestion

app.get("/list/suggest", async (req, res) => {
  try {
    const session = await pool.query("SELECT muscles_trained FROM plan GROUP BY muscles_trained ORDER BY COUNT(muscles_trained), MIN(id) LIMIT 1");
    res.json(session.rows[0])
  } catch (err) {
    console.error(err.message);
  }
});

//do the math for the rest day

// app.get("/list/rest", async (req, res) => {
//   try {
//     const data = await pool.query("select count(*) from plan where muscles_trained = 'Rest Day'");
//     const ratio = res.json(data.rows[0])

//   } catch (err) {
//     console.error(err.message);
//   }
// });

const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});

export default app;