import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool, db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const PgStore = connectPgSimple(session);
app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "kcd-dental-inventory-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    proxy: process.env.NODE_ENV === "production",
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function seedDefaultUsers() {
  try {
    const [existingTalha] = await db.select().from(users).where(eq(users.username, "talha"));
    if (!existingTalha) {
      const hashed = await hashPassword("admin123");
      await db.insert(users).values({
        username: "talha",
        password: hashed,
        fullName: "Dr. Talha Falak Khalil",
        email: "talha@kcd.edu.pk",
        role: "super_admin",
        isProtected: true,
        mustChangePassword: false,
      });
      log("Default super_admin user 'talha' created");
    }

    const [existingAdmin] = await db.select().from(users).where(eq(users.username, "admin"));
    if (!existingAdmin) {
      const hashed = await hashPassword("admin123");
      await db.insert(users).values({
        username: "admin",
        password: hashed,
        fullName: "Admin",
        role: "chairman",
        isProtected: false,
        mustChangePassword: true,
      });
      log("Default chairman user 'admin' created");
    }
  } catch (e) {
    console.error("Auto-seed error (non-fatal):", e);
  }
}

(async () => {
  await seedDefaultUsers();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
