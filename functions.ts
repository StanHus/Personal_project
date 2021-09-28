import {pool} from "./server"

export async function DeleteThis (id:string) {
    const deleteSession = await pool.query("DELETE FROM plan WHERE id = $1", [
      id]);
}

export async function UpdateThis (muscles_trained: string, id:string) {
    const updateSession = await pool.query(
        "UPDATE plan SET muscles_trained = $1 WHERE id = $2",
        [muscles_trained, id]
      )
    }
