const invalidRoutes = (req, res, next) => {
    res.status(404).json({
      status: 'failure',
      message: `You're lost!`
    })
  }

  module.exports = invalidRoutes

