import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDir = path.resolve("./temp");

/**
 * ============================================================================
 * MULTER MULTIPART FILE UPLOAD CONFIGURATION
 * ============================================================================
 * Purpose:
 * - Handles PDF and Image attachments for PDF RAG and Image Analyzer agents.
 * - Stores files temporarily in the `./temp` directory with a unique timestamp prefix.
 * - Enforces a 20MB file size limit and strict PDF/image MIME type filtering.
 * ============================================================================
 */

// Ensure temp directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("only pdf and images are allowed."));
    }
};

export default multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB limit
    }
});