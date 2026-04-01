import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to initialize with service account from env if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fallback to default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "foro-upel-2026" // From firebase-applet-config.json
      });
    }
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log de inicio
  console.log(`[${new Date().toISOString()}] Servidor iniciando en puerto ${PORT}`);

  // API routes
  app.get("/api/health", (req, res) => {
    const distPath = path.join(process.cwd(), "dist");
    res.json({
      status: "ok",
      env: process.env.NODE_ENV,
      distExists: fs.existsSync(distPath),
      files: fs.existsSync(distPath) ? fs.readdirSync(distPath) : []
    });
  });

  // Admin API to update user password
  app.post("/api/admin/update-password", async (req, res) => {
    const { uid, newPassword } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Verify the requester is an admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requesterUid = decodedToken.uid;

      // Check role in Firestore
      const userDoc = await admin.firestore().collection("users").doc(requesterUid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      // Update the target user's password
      await admin.auth().updateUser(uid, {
        password: newPassword
      });

      res.json({ message: "Contraseña actualizada con éxito" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: error.message || "Error al actualizar la contraseña" });
    }
  });

  // Admin API to create a new user
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, displayName, role } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Verify the requester is an admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requesterUid = decodedToken.uid;

      // Check role in Firestore
      const userDoc = await admin.firestore().collection("users").doc(requesterUid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      // Create the user in Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || undefined
      });

      // Create the user in Firestore
      const newUser = {
        uid: userRecord.uid,
        email: email.toLowerCase(),
        displayName: displayName || null,
        role: role || "viewer",
        createdAt: Date.now()
      };

      await admin.firestore().collection("users").doc(userRecord.uid).set(newUser);

      res.json({ uid: userRecord.uid, message: "Usuario creado con éxito" });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Error al crear el usuario" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Servir archivos estáticos
    app.use(express.static(distPath));

    // Soporte para SPA (Single Page Application)
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("La aplicación se está iniciando o el build falló. Por favor, recarga en unos segundos.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] Servidor listo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
