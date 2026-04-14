import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

// Initialize Firebase Admin
if (getApps().length === 0) {
  try {
    // Try to initialize with service account from env if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // Fallback to default credentials
      initializeApp({
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

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Log de inicio
  console.log(`[${new Date().toISOString()}] Servidor iniciando en puerto ${PORT}`);
  console.log(`[${new Date().toISOString()}] Variables de entorno disponibles:`, Object.keys(process.env).filter(k => !k.includes('PASS') && !k.includes('SECRET') && !k.includes('KEY')));
  console.log(`[${new Date().toISOString()}] ¿SMTP_USER presente?:`, !!process.env.SMTP_USER);
  console.log(`[${new Date().toISOString()}] ¿SMTP_PASS presente?:`, !!process.env.SMTP_PASS);

  // API routes
  app.get("/api/debug-env", (req, res) => {
    res.json({
      keys: Object.keys(process.env).filter(k => !k.includes('PASS') && !k.includes('SECRET') && !k.includes('KEY')),
      smtp_user_exists: !!process.env.SMTP_USER,
      smtp_pass_exists: !!process.env.SMTP_PASS,
      gemini_key_exists: !!process.env.GEMINI_API_KEY,
      app_url_exists: !!process.env.APP_URL,
      node_env: process.env.NODE_ENV
    });
  });

  app.get("/api/check-smtp-status", (req, res) => {
    res.json({
      configured: !!process.env.SMTP_USER && !!process.env.SMTP_PASS,
      user_exists: !!process.env.SMTP_USER,
      pass_exists: !!process.env.SMTP_PASS,
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || "587"
    });
  });
  app.get("/api/health", (req, res) => {
    const distPath = path.join(process.cwd(), "dist");
    res.json({
      status: "ok",
      env: process.env.NODE_ENV,
      distExists: fs.existsSync(distPath),
      files: fs.existsSync(distPath) ? fs.readdirSync(distPath) : []
    });
  });

  // Email API to send certificate
  app.post("/api/send-certificate", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/send-certificate - Recibido para: ${req.body.email}`);
    const { email, name, eventName, pdfBase64 } = req.body;

    if (!email || !name || !eventName || !pdfBase64) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    try {
      // Diagnóstico específico
      const missing = [];
      if (!process.env.SMTP_USER) missing.push("SMTP_USER");
      if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
      
      if (missing.length > 0) {
        const availableKeys = Object.keys(process.env).filter(k => 
          k.toLowerCase().includes('smtp') || 
          k.toLowerCase().includes('mail') || 
          k.toLowerCase().includes('user') || 
          k.toLowerCase().includes('pass')
        );
        const hint = availableKeys.length > 0 
          ? ` Variables similares encontradas: ${availableKeys.join(", ")}.` 
          : " No se encontraron variables relacionadas con SMTP.";
        
        throw new Error(`Configuración SMTP incompleta. Faltan: ${missing.join(", ")}.${hint} Asegúrate de agregarlos en Settings > Secrets.`);
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || `"AmadeusEvent - Sistema de Certificados" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Certificado de Participación - ${eventName}`,
        text: `Estimado(a) ${name},\n\nEs un honor para nosotros hacerle entrega de su certificado de participación en el evento "${eventName}".\n\n"Investigar para comprender, escribir para transcender"\n\nAtentamente,\nComisión de Tecnología`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">Certificado de Participación</h1>
            </div>
            <p>Estimado(a) <strong>${name}</strong>,</p>
            <p>Es un honor para nosotros hacerle entrega formal de su certificado de participación correspondiente al evento:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
              <strong style="font-size: 18px; color: #334155;">${eventName}</strong>
            </div>
            <p>Adjunto a este mensaje encontrará el documento en formato PDF.</p>
            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <p style="font-style: italic; color: #64748b; margin-bottom: 15px;">"Investigar para comprender, escribir para transcender"</p>
              <p style="font-weight: bold; color: #4f46e5; margin: 0;">Comisión de Tecnología 2026</p>
            </div>
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 30px;">
              Este es un mensaje automático generado por el Sistema AmadeusEvent. Por favor, no responda a este correo.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `Certificado_${name.replace(/\s+/g, '_')}.pdf`,
            content: pdfBase64,
            encoding: 'base64'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: "Certificado enviado con éxito" });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: error.message || "Error al enviar el correo" });
    }
  });

  // Email API to send credential
  app.post("/api/send-credential", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/send-credential - Recibido para: ${req.body.email}`);
    const { email, name, eventName, pdfBase64 } = req.body;

    if (!email || !name || !eventName || !pdfBase64) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    try {
      const missing = [];
      if (!process.env.SMTP_USER) missing.push("SMTP_USER");
      if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
      
      if (missing.length > 0) {
        throw new Error(`Configuración SMTP incompleta. Faltan: ${missing.join(", ")}. Asegúrate de agregarlos en Settings > Secrets.`);
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || `"AmadeusEvent - Sistema de Credenciales" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Tu Credencial de Acceso - ${eventName}`,
        text: `Estimado(a) ${name},\n\nAdjunto encontrarás tu credencial de acceso para el evento "${eventName}".\n\nPor favor, imprímela o llévala en tu dispositivo móvil para agilizar tu ingreso.\n\nAtentamente,\nComisión de Tecnología`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">Tu Credencial de Acceso</h1>
            </div>
            <p>Estimado(a) <strong>${name}</strong>,</p>
            <p>Adjunto a este mensaje encontrarás tu credencial de acceso para el evento:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
              <strong style="font-size: 18px; color: #334155;">${eventName}</strong>
            </div>
            <p>Por favor, asegúrate de tenerla disponible (impresa o digital) al momento de tu llegada para agilizar el proceso de acreditación.</p>
            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <p style="font-weight: bold; color: #4f46e5; margin: 0;">Comisión de Tecnología 2026</p>
            </div>
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 30px;">
              Este es un mensaje automático generado por el Sistema AmadeusEvent. Por favor, no responda a este correo.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `Credencial_${name.replace(/\s+/g, '_')}.pdf`,
            content: pdfBase64,
            encoding: 'base64'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: "Credencial enviada con éxito" });
    } catch (error: any) {
      console.error("Error sending credential email:", error);
      res.status(500).json({ error: error.message || "Error al enviar el correo" });
    }
  });

  // Email API to send registration confirmation
  app.post("/api/send-registration-email", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/send-registration-email - Recibido para: ${req.body.email}`);
    const { email, name, eventName } = req.body;

    if (!email || !name || !eventName) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    try {
      // Diagnóstico específico
      const missing = [];
      if (!process.env.SMTP_USER) missing.push("SMTP_USER");
      if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
      
      if (missing.length > 0) {
        const availableKeys = Object.keys(process.env).filter(k => 
          k.toLowerCase().includes('smtp') || 
          k.toLowerCase().includes('mail') || 
          k.toLowerCase().includes('user') || 
          k.toLowerCase().includes('pass')
        );
        const hint = availableKeys.length > 0 
          ? ` Variables similares encontradas: ${availableKeys.join(", ")}.` 
          : " No se encontraron variables relacionadas con SMTP.";
        
        throw new Error(`Configuración SMTP incompleta. Faltan: ${missing.join(", ")}.${hint}`);
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || `"AmadeusEvent - Sistema de Registro" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Confirmación de Registro - ${eventName}`,
        text: `Estimado(a) ${name},\n\nLe informamos que su registro para el evento "${eventName}" ha sido procesado exitosamente.\n\n"Investigar para comprender, escribir para transcender"\n\nAtentamente,\nComisión de Tecnología`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">Confirmación de Registro</h1>
            </div>
            <p>Estimado(a) <strong>${name}</strong>,</p>
            <p>Le informamos que su proceso de registro para el siguiente evento ha sido completado con éxito:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
              <strong style="font-size: 18px; color: #334155;">${eventName}</strong>
            </div>
            <p>Agradecemos su interés y participación. Próximamente recibirá más detalles sobre el desarrollo de la actividad.</p>
            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <p style="font-style: italic; color: #64748b; margin-bottom: 15px;">"Investigar para comprender, escribir para transcender"</p>
              <p style="font-weight: bold; color: #4f46e5; margin: 0;">Comisión de Tecnología 2026</p>
            </div>
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 30px;">
              Este es un mensaje automático generado por el Sistema AmadeusEvent. Por favor, no responda a este correo.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: "Correo de registro enviado con éxito" });
    } catch (error: any) {
      console.error("Error sending registration email:", error);
      res.status(500).json({ error: error.message || "Error al enviar el correo" });
    }
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
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const requesterUid = decodedToken.uid;
      const requesterEmail = decodedToken.email?.toLowerCase();

      // Check role in Firestore
      const userDoc = await getFirestore().collection("users").doc(requesterUid).get();
      const userData = userDoc.data();

      const isMainAdmin = requesterEmail === "sahejoan@gmail.com";
      const isFirestoreAdmin = userData && userData.role === "admin";

      if (!isMainAdmin && !isFirestoreAdmin) {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      // Update the target user's password
      await getAuth().updateUser(uid, {
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
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const requesterUid = decodedToken.uid;
      const requesterEmail = decodedToken.email?.toLowerCase();

      // Check role in Firestore
      const userDoc = await getFirestore().collection("users").doc(requesterUid).get();
      const userData = userDoc.data();

      const isMainAdmin = requesterEmail === "sahejoan@gmail.com";
      const isFirestoreAdmin = userData && userData.role === "admin";

      if (!isMainAdmin && !isFirestoreAdmin) {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      // Create the user in Auth
      const userRecord = await getAuth().createUser({
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

      await getFirestore().collection("users").doc(userRecord.uid).set(newUser);

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

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(`[${new Date().toISOString()}] Error global:`, err);
    res.status(err.status || 500).json({
      error: err.message || "Error interno del servidor",
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] Servidor listo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
