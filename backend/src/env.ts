import dotenv from "dotenv";
import path from "path";

// Initialize environment variables globally for the backend process
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
