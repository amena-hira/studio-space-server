import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 8000;

const DB_USER = encodeURIComponent(process.env.DB_USER || "");
const DB_PASSWORD = encodeURIComponent(process.env.DB_PASSWORD || "");

const client = new MongoClient(`mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.nvjlqis.mongodb.net/`);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("studio-space");
const studioCollection = db.collection("studios");
const categoryCollection = db.collection("categories");

app.get("/", (req, res) => {
    res.send("Hello from the server!");
});

app.get("/studios/top-rated", async (req, res) => {
    try {
        const topRatedStudios = await studioCollection.find().sort({ rating: -1 }).limit(6).toArray();
        res.json(topRatedStudios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while fetching top-rated studios." });
    }
});

app.get("/studios", async (req, res) => {
    try {
        const studios = await studioCollection.find().toArray();
        res.json(studios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while fetching studios." });
    }
});

app.get("/studios/:id", async (req, res) => {
    const { id } = req.params
    console.log(id)
    try {
        const studio = await studioCollection.findOne({ _id: new ObjectId(id) })
        res.json(studio);
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "An error occurred while fetching studios." });
    }
})

app.get("/studios/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const result = await studioCollection.find({ email }).toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching studios:", error);
        res.status(500).send({ message: "Failed to fetch studios", error: error.message });
    }
})

app.post("/studios", async (req, res) => {
    const data = req.body
    try {
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).send({ message: "Request body cannot be empty" });
        }
        const result = await studioCollection.insertOne(data);
        // console.log(result);
        res.send(result);
        
    } catch (error) {
        console.error("Error inserting destination:", error);
        res.status(500).send({ message: "Failed to insert destination", error: error.message });
    }

})


app.get("/categories", async (req, res) => {
    try {
        const categories = await categoryCollection.find().toArray();
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while fetching categories." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});