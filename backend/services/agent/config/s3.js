import { S3Client } from "@aws-sdk/client-s3";

/**
 * ============================================================================
 * AWS S3 CLIENT CONFIGURATION
 * ============================================================================
 * Used for storing and retrieving generated PDF reports, PowerPoint decks,
 * and synthesized AI vision images with presigned download links.
 * ============================================================================
 */
export const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    }
});