import mongoose from "mongoose";

/**
 * ============================================================================
 * MONGODB CONNECTION HANDLER (Agent Service)
 * ============================================================================
 */
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Agent Service MongoDB connected");
    } catch (error) {
        console.error(`Agent Service DB connection failed: ${error}`);
    }
};

export default connectDb;