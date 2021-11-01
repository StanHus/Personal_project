import { Pool } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { DeleteThis, UpdateThis } from "./functions";

config();

const herokuSSLSetting = { rejectUnauthorized: false };
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
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
app.use(cors()); //add CORS support to each following route handler

const pool = new Pool(dbConfig);
pool.connect();

export { pool };

app.post("/list", async (req, res) => {
  try {
    const { muscles_trained, user_email } = req.body;
    const list = await pool.query(
      "INSERT INTO plan (muscles_trained, user_email) VALUES($1, $2) RETURNING *",
      [muscles_trained, user_email]
    );
    console.log("success");
    res.json(list.rows[0]);
  } catch (err) {
    res.status(500).send(err);
  }
});

//get the list

app.get("/list", async (req, res) => {
  console.log("trying");
  try {
    const list = await pool.query("SELECT * FROM plan ORDER BY id");
    res.json(list.rows);
    console.log("success");
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

//open the session page

app.get("/list/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await pool.query("SELECT * FROM plan WHERE id = $1", [id]);
    res.json(session.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

//update muscles_trained ONLY session (new version)

app.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { muscles_trained } = req.body;
  const updateSession = UpdateThis(muscles_trained, id);

  if (updateSession) {
    res.json("Muscles_trained category was updated!");
  } else {
    console.error("problem in updating");
  }
});

//delete a session (new version)

app.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const deleteSession = DeleteThis(id);

  if (deleteSession) {
    res.json("Session was deleted!");
    res.status(200);
  } else {
    console.error("problem in deleting");
    res.status(400);
  }
});

//make a SMART suggestion (including resting every once in a while)

app.get("/suggest", async (req, res) => {
  try {
    const session = await pool.query(
      "SELECT CASE WHEN (SELECT COUNT(*) AS num FROM plan GROUP BY muscles_trained ORDER BY num desc LIMIT 1) <= (SELECT COUNT(*)/3 FROM plan) THEN 'Rest' ELSE (SELECT muscles_trained FROM plan GROUP BY muscles_trained ORDER BY COUNT(muscles_trained), MIN(id) LIMIT 1) END AS answer FROM plan LIMIT 1"
    );
    res.json(session.rows[0]);
    console.log(session.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

//get the progress page
app.get("/progressPage", async (req, res) => {
  res.redirect("/progress");
});

//open the progression page (15 limit)

app.get("/progress", async (req, res) => {
  try {
    const progress = await pool.query(
      "select * from tracking ORDER BY date desc LIMIT 15"
    );
    res.json(progress.rows);
    console.log(progress.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//open progression (full)

app.get("/progressFull", async (req, res) => {
  try {
    const progress = await pool.query(
      "select * from tracking ORDER BY date desc"
    );
    res.json(progress.rows);
    console.log(progress.rows);
  } catch (err) {
    console.error(err.message);
  }
});

// post an exercise

app.post("/progress", async (req, res) => {
  try {
    const {
      date,
      muscle_group,
      exercise_name,
      sets,
      reps,
      weight,
      user_email,
    } = req.body;
    const list = await pool.query(
      "INSERT INTO tracking (date, muscle_group, exercise_name, sets, reps, weight, user_email) VALUES ($1, $2, $3, $4, $5, $6, $7) Returning *",
      [date, muscle_group, exercise_name, sets, reps, weight, user_email]
    );
    console.log("success");
    res.json(list.rows[0]);
  } catch (err) {
    res.status(500).send(err);
  }
});

//delete an exercise

app.delete("/progress/:id", async (req, res) => {
  const { id } = req.params;
  const deleteSession = await pool.query(
    "DELETE FROM tracking WHERE session_id = $1",
    [id]
  );

  if (deleteSession) {
    res.json("Session was deleted!");
    res.status(200);
  } else {
    console.error("problem in deleting");
    res.status(400);
  }
});

//get the progression by an exercise name

app.get("/exercises", async (req, res) => {
  try {
    const progress = await pool.query(
      "SELECT date, exercise_name, SUM(sets*reps*weight) AS total_weight FROM tracking GROUP BY exercise_name, date ORDER BY date"
    );
    res.json(progress.rows);
    console.log(progress.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/analysis", async (req, res) => {
  try {
    const progress = await pool.query(
      "SELECT user_email, exercise_name, SUM(sets*reps*weight) AS total_weight, COUNT(*) as days_trained, SUM(sets*reps*weight)/count(*) as average_weight, sum(sets)/count(*) as average_sets, sum(reps)/count(*) as average_reps, sum(weight)/count(*) as average_total_weight, min(sets*reps*weight) as min_session, max(sets*reps*weight) as max_session FROM tracking GROUP BY exercise_name, user_email"
    );
    res.json(progress.rows); //exercise_name, total_weight, days_trained, average_total_weight, average_weight, average_sets, average_reps
    console.log(progress.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/options", async (req, res) => {
  try {
    const progress = await pool.query(
      "SELECT exercise_name from tracking group by exercise_name order by exercise_name"
    );
    res.json(progress.rows);
    console.log(progress.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/analysis/:exercise", async (req, res) => {
  const { exercise_name } = req.params;
  try {
    const progression = await pool.query(
      "SELECT session_id, exercise_name, sets * reps * weight AS total_weight FROM tracking WHERE exercise_name = $1 ORDER BY date",
      [exercise_name]
    );
    res.json(progression.rows);
  } catch (err) {
    console.error(err.message);
  }
});

function capitalise(str: string) {
  let ans = [];
  let arr = str.split("");
  ans.push(arr[0].toUpperCase());
  ans.push(arr.slice(1).join(""));
  console.log(arr);
  return ans.join("");
}

app.get("/analysis/:dips", async (req, res) => {
  const { dips } = req.params;
  const capital = capitalise(dips);
  try {
    const progression = await pool.query(
      "SELECT session_id, exercise_name, sets * reps * weight AS total_weight FROM tracking WHERE exercise_name = $1 ORDER BY date",
      [capital]
    );
    res.json(progression.rows);
  } catch (err) {
    console.error(err.message);
  }
});

const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});

export default app;
