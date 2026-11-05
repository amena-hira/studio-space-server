import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 8000;

const DB_USER = encodeURIComponent(process.env.DB_USER || "");
const DB_PASSWORD = encodeURIComponent(process.env.DB_PASSWORD || "");
const BASE_URL = process.env.BASE_URL

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
const bookingCollection = db.collection("bookings");

app.get("/", (req, res) => {
    res.send("Hello from the server!");
});

// verify token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
    const JWKS = createRemoteJWKSet(new URL(`${BASE_URL}/api/auth/jwks`));
    try {
        const { payload } = await jwtVerify(token, JWKS);
        next();
    } catch (err) {
        console.error("JWT verification error:", err);
        return res.status(401).send({ message: "Unauthorized access" });
    }
}

// bookings

app.get("/bookings/user/:email", verifyToken, async (req, res) => {
    try {
        const { email } = req.params;
        const result = await bookingCollection.find({ userEmail: email })
            .sort({ createdAt: -1 }).toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching studios:", error);
        res.status(500).send({ message: "Failed to fetch studios", error: error.message });
    }
})

app.patch("/bookings/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid booking id" });
        }

        const filter = {
            _id: new ObjectId(id),
            status: { $nin: ["cancelled", "completed"] },
        };

        const result = await bookingCollection.updateOne(filter, {
            $set: { status: "cancelled" },
        });

        if (result.matchedCount === 0) {
            return res.status(404).send({
                message: "Booking not found or cannot be cancelled",
            });
        }

        const booking = await bookingCollection.findOne({
            _id: new ObjectId(id),
        });

        res.send({
            message: "Booking cancelled successfully",
            booking,
        });
    } catch (error) {
        console.error("Error cancelling booking:", error);

        res.status(500).send({
            message: "Failed to cancel booking",
        });
    }
});

app.post("/bookings", verifyToken, async (req, res) => {
    const data = req.body
    try {
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).send({ message: "Request body cannot be empty" });
        }
        const existingBooking = await bookingCollection.findOne({
            studioId:data.studioId,
            bookingDate:data.bookingDate,
            status: "Confirmed",
            startTime: { $lt: data.endTime },
            endTime: { $gt: data.startTime },
        });
        if (existingBooking) {
            return res.status(409).send({
                message: "This studio is already booked for the selected time.",
            });
        }
        const result = await bookingCollection.insertOne(data);
        // console.log(result);
        res.send(result);

    } catch (error) {
        console.error("Error inserting booking:", error);
        res.status(500).send({ message: "Failed to insert booking", error: error.message });
    }
})

// studios

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
    try {
        const studio = await studioCollection.findOne({ _id: new ObjectId(id) })
        res.json(studio);
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "An error occurred while fetching studios." });
    }
})

app.get("/studios/user/:email", verifyToken, async (req, res) => {
    try {
        const { email } = req.params;
        const result = await studioCollection.find({ userEmail: email }).toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching studios:", error);
        res.status(500).send({ message: "Failed to fetch studios", error: error.message });
    }
})

app.post("/studios", verifyToken, async (req, res) => {
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

app.patch("/studios/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid studio id" });
        }
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).send({ message: "Request body cannot be empty" });
        }

        const filter = { _id: new ObjectId(id) };
        const result = await studioCollection.updateOne(filter, { $set: data });

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Studio not found" });
        }

        const studio = await studioCollection.findOne(filter);
        res.send(studio);
    } catch (error) {
        console.error("Error updating studio:", error);
        res.status(500).send({ message: "Failed to update studio", error: error.message });
    }
})

app.delete("/studios/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid studio id" });
        }

        const result = await studioCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Studio not found" });
        }

        res.send({ acknowledged: true, deletedId: id });
    } catch (error) {
        console.error("Error deleting studio:", error);
        res.status(500).send({ message: "Failed to delete studio", error: error.message });
    }
})

// categories

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