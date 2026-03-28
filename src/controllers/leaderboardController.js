const User = require('../models/User');

// Scoped leaderboard: global, national, state, district, city, area
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { scope = 'global', country, state, district, city, area } = req.query;
    const limit = parseInt(req.query.limit) || 50;

    const filter = {};

    switch (scope) {
      case 'national':
        if (country) filter['location.country'] = country;
        break;
      case 'state':
        if (state) filter['location.state'] = state;
        break;
      case 'district':
        if (district) filter['location.district'] = district;
        break;
      case 'city':
        if (city) filter['location.city'] = city;
        break;
      case 'area':
        if (area) filter['location.area'] = area;
        break;
      // 'global' — no filter
    }

    const users = await User.find(filter)
      .select('name avatar location karmaPoints totalSubmissions approvedSubmissions')
      .sort({ karmaPoints: -1 })
      .limit(limit)
      .lean();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      location: user.location?.city || 'Unknown',
      karmaPoints: user.karmaPoints,
      helpsCount: user.approvedSubmissions,
    }));

    res.json({ data: leaderboard });
  } catch (error) {
    next(error);
  }
};

// Keep backward compat endpoints
exports.getGlobal = async (req, res, next) => {
  req.query.scope = 'global';
  return exports.getLeaderboard(req, res, next);
};

exports.getLocal = async (req, res, next) => {
  req.query.scope = 'city';
  return exports.getLeaderboard(req, res, next);
};
