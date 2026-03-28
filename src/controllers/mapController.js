const Submission = require('../models/Submission');

exports.getHeatmapData = async (req, res, next) => {
  try {
    const submissions = await Submission.find({
      status: 'approved',
      'location.coordinates.0': { $exists: true },
    })
      .select('location submissionType')
      .lean();

    const heatmapData = submissions.map((s) => ({
      latitude: s.location.coordinates[1],
      longitude: s.location.coordinates[0],
      weight: 1,
    }));

    // Aggregate nearby points for density
    const aggregated = {};
    heatmapData.forEach((point) => {
      // Round to ~1km grid
      const key = `${point.latitude.toFixed(2)},${point.longitude.toFixed(2)}`;
      if (aggregated[key]) {
        aggregated[key].weight += 1;
      } else {
        aggregated[key] = { ...point };
      }
    });

    res.json({ data: Object.values(aggregated) });
  } catch (error) {
    next(error);
  }
};

exports.getCities = async (req, res, next) => {
  try {
    const cities = await Submission.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$address.city',
          count: { $sum: 1 },
          region: { $first: '$address.region' },
          avgLat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
          avgLng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
        },
      },
      { $match: { _id: { $ne: '' } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      data: cities.map((c) => ({
        city: c._id,
        region: c.region,
        count: c.count,
        latitude: c.avgLat,
        longitude: c.avgLng,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 50 } = req.query;

    let query = {
      status: 'approved',
      'location.coordinates.0': { $exists: true },
    };

    // If lat/lng provided, use geo query; otherwise return all with location
    if (lat && lng) {
      query.location = {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            parseFloat(radius) / 6378.1,
          ],
        },
      };
      delete query['location.coordinates'];
    }

    const submissions = await Submission.find(query)
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ data: submissions });
  } catch (error) {
    next(error);
  }
};
