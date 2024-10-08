const express = require('express')
const router = express.Router()
const {createService} = require('../controllers/admin-services.controllers')

/**
 *@openapi
 * /services:
 *   post:
 *     summary: Create a new service
 *     description: Creates a new service if it doesn't already exist.
 *     tags:
 *       - Services
 *     parameters:
 *       - in: body
 *         name: service
 *         description: The service details
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - service_name
 *           properties:
 *             service_name:
 *               type: string
 *               description: Name of the service
 *     responses:
 *       201:
 *         description: Service successfully created
 *       400:
 *         description: Invalid input, service name is required or too short
 *       409:
 *         description: Conflict, service already exists
 *       500:
 *         description: Internal server error
 */
router.post('/services',createService)



module.exports = router