import mongoose from "mongoose";

/**
 * ============================================================================
 * MONGODB CONNECTION HANDLER (Billing Service)
 * ============================================================================
 */
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Billing Service MongoDB connected");
    } catch (error) {
        console.error(`Billing Service DB connection failed: ${error}`);
    }
};

export default connectDb;