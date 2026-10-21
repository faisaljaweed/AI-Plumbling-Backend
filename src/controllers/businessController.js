const { emailValid,phoneValid }=require('../utils/validation');
const pool = require("../config/db");

const getBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if(Number(id)!==Number(process.env.BUSINESS_ID || 1)) return res.status(404).json({success:false,message:'Business not found'});
    const result = await pool.query(
      `
      SELECT *
      FROM businesses
      WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get business error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch business",
    });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    const { name, email, phone, address, city, state } = req.body;
    if ((email !== undefined && !emailValid(email)) || (phone !== undefined && !phoneValid(phone)) || (name !== undefined && (typeof name !== 'string' || name.trim().length<2 || name.length>100)) || [address,city,state].some(value=>value !== undefined && (typeof value !== 'string' || value.length>250))) return res.status(400).json({success:false,message:'Enter valid business details and contact information.'});

    if(Number(id)!==Number(process.env.BUSINESS_ID || 1)) return res.status(404).json({success:false,message:'Business not found'});
    const result = await pool.query(
      `
      UPDATE businesses
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        address = COALESCE($4, address),
        city = COALESCE($5, city),
        state = COALESCE($6, state)
      WHERE id = $7
      RETURNING *
      `,
      [
        name || null,
        email || null,
        phone || null,
        address || null,
        city || null,
        state || null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update business error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update business",
    });
  }
};

module.exports = {
  getBusiness,
  updateBusiness,
};

