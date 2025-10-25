import mysql from 'mysql2/promise';
// Optional: Import bcryptjs if implementing password hashing
// import bcrypt from 'bcryptjs';

// --- Database Connection Pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00' // Use UTC or your preferred timezone
});

// --- Helper Functions ---
/** Safely formats a value for CSV export */
const formatCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    let str = String(value);
    str = str.replace(/"/g, '""'); // Escape double quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str}"`; // Enclose in quotes if necessary
    }
    return str;
};

// --- Main Lambda Handler ---
export const handler = async (event) => {
  // --- CORS Headers ---
  const headers = {
    "Access-Control-Allow-Origin": "*", // IMPORTANT: Restrict to your Firebase domain in production!
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "Content-Disposition", // Needed for filename in download
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  // --- Handle CORS Preflight (OPTIONS request) ---
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // --- Extract Request Details ---
  const action = event.queryStringParameters?.action;
  const method = event.requestContext.http.method;
  const queryParams = event.queryStringParameters || {};
  let body = {};

  // --- Parse Body for POST requests ---
  if (method === 'POST') {
    try {
        body = JSON.parse(event.body || '{}');
    } catch (parseError) {
        console.error("JSON Parsing Error:", parseError);
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Cuerpo de la solicitud JSON inválido." }) };
    }
  }

  // --- Main Try/Catch Block for Actions ---
  try {
    // --- Action Routing ---

    // 1. LIST BUSINESSES (GET)
    if (method === 'GET' && action === 'listBusinesses') {
        const { q, category } = queryParams;
        let sql = `
            SELECT n.id_negocio, n.nombre_negocio, n.email, n.telefono, n.tipo_negocio, n.ubicacion, n.descripcion, uw.nombre as representante
            FROM negocio n
            LEFT JOIN usuario_web uw ON n.id_usuario = uw.id_usuario
            WHERE 1=1
        `;
        const params = [];

        if (q) {
            sql += ` AND (n.nombre_negocio LIKE ? OR n.email LIKE ? OR uw.nombre LIKE ? OR n.tipo_negocio LIKE ? OR n.ubicacion LIKE ? OR n.descripcion LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (category) {
            sql += ` AND n.tipo_negocio LIKE ?`;
            params.push(`%${category}%`);
        }
        sql += ` ORDER BY n.nombre_negocio LIMIT 100`; // Consider adding pagination in the future

        const [negocios] = await pool.query(sql, params);

        // Map fields for frontend consistency
        const results = negocios.map(n => ({
            id: n.id_negocio, nombre: n.nombre_negocio, representante: n.representante || 'N/A',
            correo: n.email, telefono: n.telefono, categoria: n.tipo_negocio,
            ubicacion: n.ubicacion, descripcion: n.descripcion
        }));
        return { statusCode: 200, headers, body: JSON.stringify(results) };
    }

    // 2. ADD BUSINESS (POST)
    if (method === 'POST' && action === 'addBusiness') {
        const { nombre, representante, correo, telefono, categoria, ubicacion, descripcion } = body;
        const descValue = descripcion || ''; // Use provided description or empty string
        // Validation
        if (!nombre || !representante || !correo || !telefono || !categoria || !ubicacion) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Faltan campos requeridos (nombre, representante, correo, tel, categoría, ubicación)." }) };
        }
         if (!/\S+@\S+\.\S+/.test(correo)) {
             return { statusCode: 400, headers, body: JSON.stringify({ message: "Formato de correo inválido." }) };
         }

        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            // A. Create associated web user
            // !! SECURITY WARNING: Use a secure password generation/hashing strategy !!
            const defaultPassword = "temporaryPassword123!"; // Replace with secure generation
            // Example using bcrypt (install bcryptjs: npm install bcryptjs)
            // const salt = await bcrypt.genSalt(10);
            // const hashedPassword = await bcrypt.hash(defaultPassword, salt);
            const hashedPassword = defaultPassword; // Placeholder - REPLACE WITH HASHING

            const [userResult] = await connection.query(
                `INSERT INTO usuario_web (nombre, correo, contrasena, id_creador) VALUES (?, ?, ?, ?)`,
                [representante, correo, hashedPassword, null] // Assuming admin (null creator) adds directly
            );
            const newUserId = userResult.insertId;
            if (!newUserId) throw new Error("Failed to create user entry.");

            // B. Assign 'negocio' role (assuming role ID 3 exists and is correct)
            await connection.query(`INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)`, [newUserId, 3]);

            // C. Insert the business linked to the new user
            const [negocioResult] = await connection.query(
                `INSERT INTO negocio (id_usuario, nombre_negocio, tipo_negocio, ubicacion, telefono, email, descripcion)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [newUserId, nombre, categoria, ubicacion, telefono, correo, descValue]
            );
             const newNegocioId = negocioResult.insertId;

            await connection.commit();
            connection.release();
            // Return the ID of the newly created business
            return { statusCode: 201, headers, body: JSON.stringify({ message: "Negocio agregado exitosamente.", newBusinessId: newNegocioId }) };

        } catch (err) {
            await connection.rollback();
            connection.release();
            console.error("Error adding business:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                const field = err.message.includes('correo') ? 'correo' : err.message.includes('email') ? 'email' : 'desconocido';
                return { statusCode: 409, headers, body: JSON.stringify({ message: `Error: El ${field} ya está registrado.` }) };
            }
             if (err.errno === 1452) { // Foreign key constraint fails (e.g., role ID doesn't exist)
                return { statusCode: 400, headers, body: JSON.stringify({ message: "Error de referencia: No se pudo asignar el rol.", error: err.message }) };
            }
            return { statusCode: 500, headers, body: JSON.stringify({ message: "Error interno al agregar negocio.", error: err.message }) };
        }
    }

    // 3. UPDATE BUSINESS (POST)
    if (method === 'POST' && action === 'updateBusiness') {
        const idNegocio = queryParams.id_negocio; // Get ID from query params
        const { nombre, representante, correo, telefono, categoria, ubicacion, descripcion } = body;
        const descValue = descripcion || ''; // Use provided description or empty string
        if (!idNegocio || !nombre || !representante || !correo || !telefono || !categoria || !ubicacion) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Faltan campos requeridos o ID del negocio." }) };
        }
        if (!/\S+@\S+\.\S+/.test(correo)) {
             return { statusCode: 400, headers, body: JSON.stringify({ message: "Formato de correo inválido." }) };
         }

        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            // A. Get current user ID associated with the business
            const [negocioRows] = await connection.query("SELECT id_usuario FROM negocio WHERE id_negocio = ?", [idNegocio]);
            if (negocioRows.length === 0) {
                connection.release(); // Release connection before returning
                return { statusCode: 404, headers, body: JSON.stringify({ message: "Negocio no encontrado." }) };
            }
            const userId = negocioRows[0].id_usuario;

            // B. Update negocio table
            await connection.query(
                `UPDATE negocio SET nombre_negocio = ?, tipo_negocio = ?, ubicacion = ?, telefono = ?, email = ?, descripcion = ?
                 WHERE id_negocio = ?`,
                [nombre, categoria, ubicacion, telefono, correo, descValue, idNegocio]
            );

            // C. Update associated usuario_web table
            await connection.query(
                `UPDATE usuario_web SET nombre = ?, correo = ? WHERE id_usuario = ?`,
                [representante, correo, userId]
            );

            await connection.commit();
            connection.release();
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Negocio actualizado exitosamente." }) };

        } catch (err) {
            await connection.rollback();
            connection.release();
            console.error("Error updating business:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                 const field = err.message.includes('correo') ? 'correo' : err.message.includes('email') ? 'email' : 'desconocido';
                 return { statusCode: 409, headers, body: JSON.stringify({ message: `Error: El ${field} ya está en uso.` }) };
            }
            if (err.message.includes("Foreign key constraint fails")) {
                 return { statusCode: 500, headers, body: JSON.stringify({ message: "Error de consistencia de datos.", error: err.message }) };
            }
            return { statusCode: 500, headers, body: JSON.stringify({ message: "Error interno al actualizar negocio.", error: err.message }) };
        }
    }

    // 4. DELETE BUSINESS (POST)
    if (method === 'POST' && action === 'deleteBusiness') {
        const idNegocio = queryParams.id_negocio; // Get ID from query params
        if (!idNegocio) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Falta id_negocio." }) };
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            // A. Find associated user ID
            const [negocioRows] = await connection.query("SELECT id_usuario FROM negocio WHERE id_negocio = ?", [idNegocio]);
            if (negocioRows.length === 0) {
                connection.release();
                return { statusCode: 404, headers, body: JSON.stringify({ message: "Negocio no encontrado para eliminar." }) };
            }
            const userIdToDelete = negocioRows[0].id_usuario;

            // B. Delete related data (order matters)
            await connection.query("DELETE FROM oferta WHERE id_negocio = ?", [idNegocio]);
            // await connection.query("DELETE FROM redencion WHERE id_negocio = ?", [idNegocio]); // Uncomment if redencion table exists

            // C. Delete the business
            const [negocioDeleteResult] = await connection.query("DELETE FROM negocio WHERE id_negocio = ?", [idNegocio]);
             if (negocioDeleteResult.affectedRows === 0) throw new Error("Negocio encontrado pero no se pudo eliminar.");

            // D. Delete user roles
            await connection.query("DELETE FROM usuario_rol WHERE id_usuario = ?", [userIdToDelete]);

            // E. Delete the user account (!! CAUTION: Assumes 1 user = 1 business !!)
            const [userDeleteResult] = await connection.query("DELETE FROM usuario_web WHERE id_usuario = ?", [userIdToDelete]);
            if (userDeleteResult.affectedRows === 0) {
                 console.warn(`User ID ${userIdToDelete} not found during business deletion ${idNegocio}.`);
            }

            await connection.commit();
            connection.release();
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Negocio y usuario asociado eliminados exitosamente." }) };

        } catch (err) {
            await connection.rollback();
            connection.release();
            console.error("Error deleting business:", err);
             if (err.errno === 1451) { // Foreign key constraint fails
                 return { statusCode: 409, headers, body: JSON.stringify({ message: "Error: No se puede eliminar el negocio porque tiene datos relacionados.", error: err.message }) };
             }
            return { statusCode: 500, headers, body: JSON.stringify({ message: "Error interno al eliminar negocio.", error: err.message }) };
        }
    }

    // 5. DOWNLOAD CSV (GET)
    if (method === 'GET' && action === 'downloadCsv') {
        const sql = `
            SELECT n.id_negocio, n.nombre_negocio, n.tipo_negocio, n.email,
                   n.telefono, n.ubicacion, n.descripcion, uw.nombre as representante
            FROM negocio n LEFT JOIN usuario_web uw ON n.id_usuario = uw.id_usuario
            ORDER BY n.nombre_negocio
        `; // Added n.descripcion
        const [negocios] = await pool.query(sql);

        // Added Descripcion header
        const csvHeaders = ["ID Negocio", "Nombre Negocio", "Categoría", "Email", "Teléfono", "Ubicación", "Descripción", "Representante"];
        const csvRows = negocios.map(n => [
            n.id_negocio, n.nombre_negocio, n.tipo_negocio, n.email,
            n.telefono, n.ubicacion, n.descripcion, n.representante // Added n.descripcion
        ].map(formatCsvValue).join(','));

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="reporte_negocios.csv"'
            },
            body: csvContent
        };
    }

    // --- No Matching Action Found ---
    return { statusCode: 404, headers, body: JSON.stringify({ message: "Acción no válida o método HTTP incorrecto." }) };

  } catch (error) {
    // --- General Uncaught Error Handling ---
    console.error(`Lambda AdminBusinesses Error GENERAL (Action: ${action}, Method: ${method}):`, error);
    if (error instanceof SyntaxError && method === 'POST') {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Cuerpo JSON inválido." }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Error interno inesperado.", error: error.message }) };
  }
};
