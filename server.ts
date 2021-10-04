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

// const pool = new Pool({
//   user: "postgres",
//   password: "password",
//   host: "localhost",
//   port: 5432,
//   database: "workout"
// })

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

app.get("/list/:id", async (req, res) => {
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

//make a SMART suggestion (including resting every once in a while)

app.get("/suggest", async (req, res) => {
  try {
    const session = await pool.query("SELECT CASE WHEN (SELECT COUNT(*) AS num FROM plan GROUP BY muscles_trained ORDER BY num desc LIMIT 1) <= (SELECT COUNT(*)/3 FROM plan) THEN 'Rest' ELSE (SELECT muscles_trained FROM plan GROUP BY muscles_trained ORDER BY COUNT(muscles_trained), MIN(id) LIMIT 1) END AS answer FROM plan LIMIT 1");
    res.json(session.rows[0])
    console.log(session.rows[0])
  } catch (err) {
    console.error(err.message);
  }
});

//get the progress page
app.get("/progressPage", async (req, res) => {
  res.redirect("/progress")
})

//open the progression page

app.get("/progress", async (req, res) => {
  try {
    const progress = await pool.query("select * from tracking ORDER BY date desc LIMIT 15");
    res.json(progress.rows)
    console.log(progress.rows)
  } catch (err) {
    console.error(err.message);
  }
});

// post an exercise

app.post("/progress", async (req, res) => {
  try {
    const { date, muscle_group, exercise_name, sets, reps, weight } = req.body;
    const list = await pool.query(
      "INSERT INTO tracking (date, muscle_group, exercise_name, sets, reps, weight) VALUES ($1, $2, $3, $4, $5, $6) Returning *",
      [date, muscle_group, exercise_name, sets, reps, weight]
    );
    console.log("success")
    res.json(list.rows[0]);
  } catch (err) {
    res.status(500).send(err)
  }
});

//delete an exercise 

app.delete("/progress/:id", async (req, res) => {
  const { id } = req.params;
  const deleteSession = await pool.query("DELETE FROM tracking WHERE session_id = $1", [
    id]);
  
  if (deleteSession){
  res.json("Session was deleted!");
  res.status(200)
}
  else{
    console.error("problem in deleting")
    res.status(400)
  }
});

//get the progression by an exercise name

app.get("/analysis/:exercise", async (req, res) => {
  const { exercise_name } = req.params;
  try {
    const progression = await pool.query("SELECT session_id, exercise_name, sets * reps * weight AS total_weight FROM tracking WHERE exercise_name = $1 ORDER BY date", [exercise_name]);
    res.json(progression.rows)
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/analysis/dips", async (req, res) => {
  try {
    const progression = await pool.query("SELECT session_id, exercise_name, sets * reps * weight AS total_weight FROM tracking WHERE exercise_name = 'Dips' ORDER BY date");
    res.json(progression.rows)
  } catch (err) {
    console.error(err.message);
  }
});

const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});

export default app;