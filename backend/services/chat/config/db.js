import mongoose from "mongoose";

/**
 * ============================================================================
 * MONGODB CONNECTION HANDLER (Chat Service)
 * ============================================================================
 */
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Chat Service MongoDB connected");
    } catch (error) {
        console.error(`Chat Service DB connection failed: ${error}`);
    }
};

export default connectDb;