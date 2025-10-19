// functions/sendMail.js  (ajusta la ruta según tu estructura)
const logger = require("firebase-functions/logger");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const cors = require("cors")({origin: true});
const bodyParser = require("body-parser");

// Secrets configurados en Firebase
// console > Build > Functions > Variables/Secrets
const MAIL_USER = defineSecret("MAIL_USER");
const MAIL_PASS = defineSecret("MAIL_PASS");
const MAIL_TO = defineSecret("MAIL_TO");

/**
 * Lee credenciales inyectadas por Secrets.
 * @return {{user: (string|undefined),
 * pass: (string|undefined),
 * to: (string|undefined)}}
 */
function readMailConfig() {
  return {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    to: process.env.MAIL_TO,
  };
}

// Parsers para aceptar formularios HTML y JSON
const parseForm = bodyParser.urlencoded({extended: false});
const parseJson = bodyParser.json();

/**
 * Normaliza algunos campos del payload (defensas servidor):
 * - Prefija https:// si sitio_web viene sin esquema.
 * - Recorta strings.
 * - Sanitiza telefono a formato + dígitos (opcional).
 * @param {Object} data
 * @return {Object}
 */
function normalizePayload(data) {
  const out = {...data};

  for (const k of Object.keys(out)) {
    if (typeof out[k] === "string") out[k] = out[k].trim();
  }

  if (out.sitio_web) {
    const v = String(out.sitio_web);
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) {
      out.sitio_web = `https://${v}`;
    }
  }

  if (out.telefono) {
    const startsPlus = out.telefono.startsWith("+");
    const v = out.telefono.replace(/[^0-9+]/g, "").replace(/\+/g, "");
    out.telefono = (startsPlus ? "+" : "") + v;
  }

  return out;
}

/**
 * Genera el HTML del correo con los datos normalizados.
 * @param {Object} d
 * @return {string}
 */
function renderHtmlMail(d) {
  return `
    <h2>Solicitud de nuevo negocio aliado</h2>
    <p><b>Negocio:</b> ${d.nombre_negocio}</p>
    <p><b>Representante:</b> 
    ${d.representante}${d.cargo ? ` (${d.cargo})` : ""}</p>
    <p><b>Correo:</b> ${d.email}</p>
    <p><b>Teléfono:</b> ${d.telefono}</p>
    <p><b>Categoría:</b> ${d.tipo_negocio}</p>
    <p><b>Ubicación:</b> ${d.ubicacion}</p>
    <p><b>Descripción:</b> ${d.descripcion}</p>
    <p><b>Beneficio:</b> ${d.beneficio}</p>
    ${d.redes ? `<p><b>Redes:</b> ${d.redes}</p>` : ""}
    ${d.sitio_web ? `<p><b>Sitio web:</b> ${d.sitio_web}</p>` : ""}
  `;
}

exports.solicitudesNegocios = onRequest(
    {
      region: "us-central1",
      secrets: [MAIL_USER, MAIL_PASS, MAIL_TO],
    // Puedes añadir timeout/memory si lo necesitas:
    // timeoutSeconds: 30, memory: "256MiB"
    },
    (req, res) => {
      cors(req, res, () => {
      // Preflight CORS
        if (req.method === "OPTIONS") {
          return res.status(204).send("");
        }

        if (req.method !== "POST") {
          return res.status(405).send("Método no permitido");
        }

        // Acepta x-www-form-urlencoded y JSON
        parseForm(req, res, () =>
          parseJson(req, res, async () => {
            try {
              const {user, pass, to} = readMailConfig();
              if (!user || !pass || !to) {
                logger.error("Mail config incompleta (user/pass/to).");
                return res.status(500).send("Configuración de correo inválida");
              }

              const raw = req.body || {};
              const data = normalizePayload(raw);

              const required = [
                "nombre_negocio",
                "representante",
                "email",
                "telefono",
                "tipo_negocio",
                "ubicacion",
                "descripcion",
                "beneficio",
              ];
              for (const f of required) {
                if (!data[f]) {
                  return res.status(400).send(`Falta el campo: ${f}`);
                }
              }

              // Valida email simple y teléfono tipo E.164 relajado
              const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              const TEL_RE = /^\+?\d{7,15}$/;
              if (!EMAIL_RE.test(String(data.email))) {
                return res.status(400).send("Email inválido");
              }
              if (!TEL_RE.test(String(data.telefono))) {
                return res.status(400).send("Teléfono inválido");
              }

              const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {user, pass},
              });

              const mailOptions = {
                from: `"Portal Beneficio Joven" <${user}>`,
                to,
                subject: `Nueva solicitud: ${data.nombre_negocio}`,
                html: renderHtmlMail(data),
              };

              await transporter.sendMail(mailOptions);

              res.set("Content-Type", "application/json; charset=utf-8");
              return res.status(200).send({success: true});
            } catch (err) {
              logger.error("sendMail error", {
                err: String(err),
                stack: (err && err.stack) ? err.stack : undefined,
              });
              return res.status(500).send("Error al enviar el correo");
            }
          }),
        );
      });
    },
);
