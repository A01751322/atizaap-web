const logger = require("firebase-functions/logger");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const cors = require("cors")({origin: true});
const bodyParser = require("body-parser");

const MAIL_USER = defineSecret("MAIL_USER");
const MAIL_PASS = defineSecret("MAIL_PASS");
const MAIL_TO = defineSecret("MAIL_TO");

/**
 * Lee credenciales desde variables de entorno inyectadas por Secrets.
 * @return {{
 *   user: (string|undefined),
 *   pass: (string|undefined),
 *   to: (string|undefined)
 * }}
 */
function readMailConfig() {
  return {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    to: process.env.MAIL_TO,
  };
}

module.exports.solicitudesNegocios = onRequest(
    {
      region: "us-central1", secrets: [MAIL_USER, MAIL_PASS, MAIL_TO],
    }, (req, res) => {
    // Manejo CORS y preflight
      cors(req, res, () => {
        if (req.method === "OPTIONS") return res.status(204).send("");

        // Solo aceptar POST
        if (req.method !== "POST") {
          return res
              .status(405)
              .send("Método no permitido");
        }

        // Parsear application/x-www-form-urlencoded del <form>
        bodyParser.urlencoded({extended: false})(req, res, async () => {
          try {
            const {user, pass, to} = readMailConfig();
            if (!user || !pass || !to) {
              logger.error("Mail config incompleta (user/pass/to).");
              return res.status(500).send("Configuración de correo incompleta");
            }

            const data = req.body || {};
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
              if (!data[f]) return res.status(400).send(`Falta el campo: ${f}`);
            }

            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {user, pass},
            });

            const mailOptions = {
              from: `"Portal Beneficio Joven" <${user}>`,
              to,
              subject: `Nueva solicitud: ${data.nombre_negocio}`,
              html: `
            <h2>Solicitud de nuevo negocio aliado</h2>
            <p><b>Negocio:</b> ${data.nombre_negocio}</p>
            <p><b>Representante:</b> 
            ${data.representante} ${data.cargo ? `(${data.cargo})` : ""}</p>
            <p><b>Correo:</b> ${data.email}</p>
            <p><b>Teléfono:</b> ${data.telefono}</p>
            <p><b>Categoría:</b> ${data.tipo_negocio}</p>
            <p><b>Ubicación:</b> ${data.ubicacion}</p>
            <p><b>Descripción:</b> ${data.descripcion}</p>
            <p><b>Beneficio:</b> ${data.beneficio}</p>
            ${data.redes ? `<p><b>Redes:</b> ${data.redes}</p>` : ""}
            ${data.sitio_web ? `<p><b>Sitio web:</b> 
                ${data.sitio_web}</p>` : ""}
          `,
            };

            await transporter.sendMail(mailOptions);
            return res.status(200).send({success: true});
          } catch (err) {
            logger.error("sendMail error", {
              err: String(err),
              stack: err && err.stack ? err.stack : undefined,
            });
            return res.status(500).send("Error al enviar el correo");
          }
        });
      });
    });
